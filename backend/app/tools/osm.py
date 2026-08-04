"""SKILL-OUTBOUND.md source A — OpenStreetMap Overpass. Free forever, no API key,
primary source for general (non-tech) local-business categories."""

import asyncio
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outbound_lead import OutboundLead
from app.tools.common import dedupe_new_records, existing_contact_keys, fetch_email_from_website, geocode_location, matching_osm_tags

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def _build_overpass_query(category: str, bbox: dict[str, float]) -> str:
    escaped = category.replace('"', '\\"')
    # Overpass QL's bbox filter order is specifically (south,west,north,east) — named
    # lookups here on purpose, not positional unpacking, after a real bug where two
    # of the four values ended up transposed and searched a huge band across the
    # wrong countries entirely.
    bbox_str = f"{bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']}"

    # Exact tag=value match against OSM's real fixed-vocabulary tags (e.g.
    # office=estate_agent for "real estate") when the category maps to one — cheap for
    # Overpass (an indexed equality lookup). Both node and way: many real businesses
    # (offices especially) are mapped as building ways, not standalone nodes, and
    # `out center;` gives a way's centroid just fine.
    exact_tags = matching_osm_tags(category)
    exact_clauses = []
    for key, value in exact_tags:
        exact_clauses.append(f'node["{key}"="{value}"]({bbox_str});')
        exact_clauses.append(f'way["{key}"="{value}"]({bbox_str});')
    exact_block = "\n      ".join(exact_clauses)

    # Free-text regex (`~`) can't use an index — Overpass has to scan every node/way's
    # tags in the whole bbox, which is what was actually timing out (confirmed live:
    # every retry attempt still 504'd for an unmapped category over a city-sized area,
    # not a transient blip). Only run it when there's no exact tag match to fall back
    # on, and node-only (not also way) to keep it affordable on the free instance.
    loose_block = ""
    if not exact_tags:
        loose_block = f"""
      node["amenity"~"{escaped}",i]({bbox_str});
      node["shop"~"{escaped}",i]({bbox_str});
      node["office"~"{escaped}",i]({bbox_str});
      node["name"~"{escaped}",i]({bbox_str});"""

    return f"""
    [out:json][timeout:25];
    (
      {exact_block}
      {loose_block}
    );
    out center;
    """


async def find_local_businesses(
    category: str, location: str, organization_id: str, db: AsyncSession, limit: int = 15, website_email_limit: int = 5
) -> list[dict[str, Any]]:
    """Search OSM Overpass for businesses matching category+location, dedupe against
    existing outbound_leads/leads for this org, persist the new ones, and return them."""
    coords = await geocode_location(location)

    query = _build_overpass_query(category, coords["bbox"])
    async with httpx.AsyncClient(timeout=30) as client:
        # The free public Overpass instance routinely 504s (overloaded) or 429s (rate
        # limited) — independent of whether the query itself is fine. A short retry
        # clears the large majority of these rather than surfacing a transient hiccup
        # as "the search is broken."
        for attempt in range(3):
            resp = await client.post(OVERPASS_URL, data={"data": query}, headers={"User-Agent": "LeadPilot/1.0"})
            if resp.status_code not in (429, 504) or attempt == 2:
                break
            await asyncio.sleep(2 * (attempt + 1))
        resp.raise_for_status()
        data = resp.json()

    results: list[dict[str, Any]] = []
    email_targets: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    for el in data.get("elements", []):
        if len(results) >= limit:
            break
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name or name in seen_names:
            continue
        seen_names.add(name)
        address_parts = [tags[k] for k in ("addr:housenumber", "addr:street", "addr:city", "addr:postcode", "addr:country") if tags.get(k)]
        website = tags.get("website") or tags.get("contact:website") or tags.get("url")
        phone = tags.get("phone") or tags.get("contact:phone")
        rec = {
            "organization_id": organization_id,
            "business_name": name[:300],
            "category": category,
            "address": (", ".join(address_parts) or None),
            # OSM's phone tag is free text and occasionally holds several
            # semicolon-joined numbers well past the column's 64-char width — clamp
            # rather than let one messy record's INSERT fail the whole batch (real bug,
            # hit live: a single oversized phone value rolled back an entire search).
            "phone": phone[:64] if phone else None,
            "website": website[:500] if website else None,
            "email": (tags.get("email") or tags.get("contact:email") or "")[:320] or None,
            "location": location,
            "source": "osm",
            "lat": el.get("lat") or (el.get("center") or {}).get("lat"),
            "lng": el.get("lon") or (el.get("center") or {}).get("lon"),
            "status": "found",
        }
        results.append(rec)
        if website and not rec["email"] and len(email_targets) < website_email_limit:
            email_targets.append(rec)

    if email_targets:
        emails = await asyncio.gather(*(fetch_email_from_website(r["website"]) for r in email_targets))
        for rec, email in zip(email_targets, emails):
            rec["email"] = email

    existing = await existing_contact_keys(db, organization_id)
    new_records = dedupe_new_records(results, existing)

    created = [OutboundLead(**rec) for rec in new_records]
    if created:
        db.add_all(created)
        await db.commit()
        for obj in created:
            await db.refresh(obj)

    return created
