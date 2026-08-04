"""SKILL-OUTBOUND.md source C — GitHub Search API, for IT/tech categories only
(software houses, SaaS, AI agencies, developer shops). Free with a personal access
token (5,000 req/hour vs 60/hour unauthenticated) — no billing, just a free GitHub
signup. Set GITHUB_TOKEN in backend/.env. Empty token -> this source is skipped
(logged) rather than hitting GitHub's low unauthenticated rate limit and failing.
"""

import logging
import re
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.outbound_lead import OutboundLead
from app.tools.common import dedupe_new_records, existing_contact_keys

logger = logging.getLogger("leadpilot.tools.github")
API_BASE = "https://api.github.com"

# Broad/generic categories expand into several real GitHub topic slugs and get
# merged — searching a single literal `topic:IT` returns almost nothing (not a real
# GitHub topic anyone tags), and a person typing "IT" clearly also wants AI/software
# results, not just companies literally named "IT". Filler words (house/agency/etc.)
# are dropped before matching so multi-word categories like "AI software house" still
# resolve to their real topics instead of being sent as one broken multi-word query.
_FILLER_WORDS = {"house", "agency", "company", "firm", "companies", "agencies", "firms", "shop", "shops", "business", "businesses"}
_BROAD_TECH_TOPICS: dict[str, list[str]] = {
    "it": ["software", "artificial-intelligence", "saas", "web-development"],
    "tech": ["software", "artificial-intelligence", "saas", "web-development"],
    "software": ["software", "saas"],
    "startup": ["startup", "artificial-intelligence", "saas"],
    "startups": ["startup", "artificial-intelligence", "saas"],
    "ai": ["artificial-intelligence", "machine-learning", "deep-learning", "llm"],
    "artificial": ["artificial-intelligence", "machine-learning", "llm"],
    "intelligence": ["artificial-intelligence", "machine-learning", "llm"],
    "machine": ["machine-learning", "artificial-intelligence"],
    "learning": ["machine-learning", "artificial-intelligence", "deep-learning"],
    "saas": ["saas"],
    "web": ["web-development", "webapp"],
    "mobile": ["mobile", "android", "ios"],
    "app": ["mobile", "android", "ios"],
}


def _topics_for(category: str) -> list[str]:
    c = category.strip().lower()
    if c in _BROAD_TECH_TOPICS:
        return _BROAD_TECH_TOPICS[c]

    words = [w for w in re.split(r"[\s,/]+", c) if w and w not in _FILLER_WORDS]
    topics: list[str] = []
    for w in words:
        for topic in _BROAD_TECH_TOPICS.get(w, [w]):
            if topic not in topics:
                topics.append(topic)
    return topics or [re.sub(r"\s+", "-", c)]


def _location_matches(profile_location: str | None, requested_location: str) -> bool:
    """Loose containment match (city OR country level — either satisfies the user's
    own stated intent) against a GitHub profile's free-text location field. A profile
    with no location filled in is excluded when a location was actually requested —
    otherwise a "Lahore, Pakistan" search keeps coming back with devs from unrelated
    countries just because their profile happened to omit the field, which is the
    exact complaint this fixes."""
    if not profile_location:
        return False
    if not requested_location.strip():
        return True
    pl = profile_location.strip().lower()
    tokens = [t.strip() for t in re.split(r"[,/]", requested_location.strip().lower()) if t.strip()]
    return any(t in pl for t in tokens) or pl in requested_location.strip().lower()


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}


async def _org_profile(client: httpx.AsyncClient, login: str) -> dict[str, Any] | None:
    resp = await client.get(f"{API_BASE}/users/{login}")
    if resp.status_code != 200:
        return None
    return resp.json()


async def _org_tech_stack(client: httpx.AsyncClient, login: str) -> list[str]:
    resp = await client.get(f"{API_BASE}/users/{login}/repos", params={"per_page": 20, "sort": "updated"})
    if resp.status_code != 200:
        return []
    langs: set[str] = set()
    topics: set[str] = set()
    for repo in resp.json():
        if repo.get("language"):
            langs.add(repo["language"])
        topics.update(repo.get("topics") or [])
    return sorted(langs) + sorted(topics)


async def find_tech_leads(
    query_type: str, params: dict[str, Any], organization_id: str, db: AsyncSession, limit: int = 15, location: str | None = None
) -> list[dict[str, Any]]:
    """query_type: "hiring_companies" (params: location, language), "startups_by_topic"
    (params: topic), or "org_lookup" (params: name).

    `location`, when given, filters candidates by their GitHub profile's own location
    field (city-or-country containment match) — previously accepted by the router but
    silently never applied here, so a "Lahore, Pakistan" search returned developers from
    anywhere in the world as long as their repos matched the topic."""
    settings = get_settings()
    if not settings.github_token:
        logger.info("GitHub source skipped — GITHUB_TOKEN not set (free personal access token at github.com/settings/tokens)")
        return []

    # Candidate collection: "startups_by_topic" fans out across every real topic slug
    # the category expands to (see _topics_for) and merges owners; the other two query
    # types are still single queries. Collect more candidates than `limit` up front
    # since the location filter below will drop a chunk of them.
    candidate_cap = max(limit * 3, 30)
    owners: dict[str, None] = {}
    if query_type == "startups_by_topic":
        topic_queries = [(f"topic:{t}", "repositories") for t in _topics_for(params.get("topic", ""))]
        location_queries = []
        if location and location.strip():
            # GitHub's repository/topic search has no location qualifier at all, so
            # relying on the topic search alone and filtering client-side almost never
            # intersects with one specific city within a small sample (repos tagged
            # "software"/"artificial-intelligence" are dominated by unrelated countries
            # globally). GitHub's *user* search does support a real, server-side
            # `location:` qualifier — add it as its own query so accounts genuinely
            # based in the requested city surface directly, not by lucky sampling.
            city = location.split(",")[0].strip()
            if city:
                location_queries = [(f"location:{city} type:org", "users"), (f"location:{city}", "users")]
        # Location-scoped queries go FIRST — the candidate_cap below stops collecting
        # once it's full, and with topic queries first the cap filled entirely with
        # globally-irrelevant owners before the location queries ever got a turn,
        # silently producing zero location-matched results every time.
        queries = location_queries + topic_queries
    elif query_type == "hiring_companies":
        queries = [(f"language:{params.get('language', '')} location:{params.get('location', '')}".strip(), "repositories")]
    elif query_type == "org_lookup":
        queries = [(params.get("name", ""), "users")]
    else:
        raise ValueError(f"Unknown query_type: {query_type}")

    async with httpx.AsyncClient(timeout=20, headers=_headers(settings.github_token)) as client:
        for q, search_kind in queries:
            if len(owners) >= candidate_cap:
                break
            search_resp = await client.get(f"{API_BASE}/search/{search_kind}", params={"q": q, "per_page": limit})
            if search_resp.status_code != 200:
                logger.warning("GitHub search failed (%s) for q=%r: %s", search_resp.status_code, q, search_resp.text[:300])
                continue
            for item in search_resp.json().get("items", []):
                login = (item.get("owner", {}) or {}).get("login") if search_kind == "repositories" else item.get("login")
                if login and login not in owners:
                    owners[login] = None

        results: list[dict[str, Any]] = []
        for login in list(owners)[:candidate_cap]:
            if len(results) >= limit:
                break
            profile = await _org_profile(client, login)
            if not profile:
                continue
            if location and not _location_matches(profile.get("location"), location):
                continue
            tech_stack = await _org_tech_stack(client, login)
            results.append(
                {
                    "organization_id": organization_id,
                    "business_name": profile.get("name") or login,
                    "category": params.get("topic") or params.get("language") or "software/IT",
                    "address": profile.get("location"),
                    "phone": None,
                    "website": profile.get("blog") or profile.get("html_url"),
                    # Public email is frequently hidden by user choice — a genuine limit,
                    # not a bug (SKILL-OUTBOUND.md §7). Save the lead anyway with the
                    # website/GitHub profile as the contact path instead of skipping it.
                    "email": profile.get("email"),
                    "location": profile.get("location"),
                    "tech_stack": tech_stack or None,
                    "github_org_or_user": login,
                    "source": "github",
                    "status": "found",
                }
            )

    existing = await existing_contact_keys(db, organization_id)
    new_records = dedupe_new_records(results, existing)

    created = [OutboundLead(**rec) for rec in new_records]
    if created:
        db.add_all(created)
        await db.commit()
        for obj in created:
            await db.refresh(obj)

    return created
