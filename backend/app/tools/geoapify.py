"""SKILL-OUTBOUND.md source B — Geoapify Places API. Fallback only, triggered when
OSM Overpass returns too few results for a search — Geoapify's free tier has a daily
request cap, OSM doesn't, so OSM stays primary to keep this feature sustainable at $0.

Free tier: sign up at https://www.geoapify.com/, no credit card, and set
GEOAPIFY_API_KEY in backend/.env. Empty key -> this source is skipped (logged), the
search just returns whatever OSM already found rather than failing outright.
"""

import logging
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.outbound_lead import OutboundLead
from app.tools.common import dedupe_new_records, existing_contact_keys, fetch_email_from_website, geocode_location, matching_geoapify_category

logger = logging.getLogger("leadpilot.tools.geoapify")
PLACES_URL = "https://api.geoapify.com/v2/places"


async def find_places_geoapify(category: str, location: str, organization_id: str, db: AsyncSession, limit: int = 15) -> list[dict[str, Any]]:
    settings = get_settings()
    if not settings.geoapify_api_key:
        logger.info("Geoapify skipped — GEOAPIFY_API_KEY not set (free signup at geoapify.com)")
        return []
    if limit <= 0:
        return []

    coords = await geocode_location(location)
    bbox = coords["bbox"]
    # When the category maps to a real Geoapify taxonomy slug (e.g. "real estate" ->
    # office.estate_agent), query that directly — far more precise than the generic
    # 4-bucket net below, which returns every cafe/office/clinic in the radius and lets
    # a specific-but-rare category (like real estate agencies) get crowded out of the
    # `limit` before it ever reaches the text filter. Falls back to the broad buckets +
    # loose text match for anything unmapped, unchanged from before.
    exact_slug = matching_geoapify_category(category)
    params = {
        "categories": exact_slug or "commercial,office,catering,healthcare",
        # rect over the resolved place's real bounding box (two diagonal corners,
        # NW then SE — Geoapify's rect filter just needs any two opposite corners) —
        # not a fixed-radius circle around a single point, which mostly missed the
        # mark for a bare city or bare country name.
        "filter": f"rect:{bbox['west']},{bbox['north']},{bbox['east']},{bbox['south']}",
        "bias": f"proximity:{coords['lon']},{coords['lat']}",
        # Fetch more than the requested limit — the loose text-match below (unmapped
        # categories) discards a chunk, so asking for exactly `limit` raw candidates
        # would usually undershoot it after filtering.
        "limit": min(30, max(limit * 2, 10)),
        "apiKey": settings.geoapify_api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(PLACES_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError:
        logger.exception("Geoapify Places request failed")
        return []

    # Trust Geoapify's own categorization once we've already asked for the exact
    # slug — a business named e.g. "Prime Properties" would wrongly fail a text match
    # against ["real", "estate"] despite being correctly categorized.
    category_words = [] if exact_slug else [w for w in category.lower().split() if len(w) > 2]
    results: list[dict[str, Any]] = []
    for feature in data.get("features", []):
        if len(results) >= limit:
            break
        props = feature.get("properties", {})
        name = props.get("name")
        if not name:
            continue
        haystack = f"{name} {' '.join(props.get('categories', []))}".lower()
        if category_words and not any(w in haystack for w in category_words):
            continue
        address_parts = [props.get(k) for k in ("housenumber", "street", "city", "postcode", "country") if props.get(k)]
        phone = props.get("contact", {}).get("phone") if isinstance(props.get("contact"), dict) else None
        website = props.get("website") or (props.get("contact", {}) or {}).get("website")
        rec = {
            "organization_id": organization_id,
            "business_name": name[:300],
            "category": category,
            "address": ", ".join(address_parts) or props.get("formatted"),
            "phone": phone[:64] if phone else None,
            "website": website[:500] if website else None,
            "email": ((props.get("contact", {}) or {}).get("email") or "")[:320] or None,
            "location": location,
            "source": "geoapify",
            "lat": props.get("lat"),
            "lng": props.get("lon"),
            "status": "found",
        }
        results.append(rec)

    for rec in results:
        if rec["website"] and not rec["email"]:
            rec["email"] = await fetch_email_from_website(rec["website"])

    existing = await existing_contact_keys(db, organization_id)
    new_records = dedupe_new_records(results, existing)

    created = [OutboundLead(**rec) for rec in new_records]
    if created:
        db.add_all(created)
        await db.commit()
        for obj in created:
            await db.refresh(obj)

    return created
