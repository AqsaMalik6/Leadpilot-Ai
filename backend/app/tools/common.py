"""Shared helpers for outbound-lead source tools (osm.py, geoapify.py, github_leads.py)
— SKILL-OUTBOUND.md. Kept tiny and dependency-free so each source tool stays a plain,
independent function the router can call."""

import re
from typing import Any

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead as LeadModel
from app.models.outbound_lead import OutboundLead

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"



# Nominatim returns a real boundingbox for the resolved place (city, country,
# whatever) — a bare country name genuinely covers a huge area, and geocoding it to
# one center point with a small fixed-radius circle around it (the previous
# approach) mostly lands nowhere near any actual business. Use the real bbox instead,
# but clip each half-span to this cap so "Pakistan" alone still searches a much wider,
# more representative window than a single city without ballooning into a query big
# enough to reliably time out the free search backends.
_MAX_BBOX_HALF_SPAN_DEG = 0.55  # roughly ~60km


async def geocode_location(location: str) -> dict[str, float]:
    """Free, keyless geocoding (OpenStreetMap Nominatim) — shared by every source tool
    that needs a center point + bounding box. `bbox` is a dict with named
    south/west/north/east keys (deliberately not a positional tuple — a previous
    version used one and two of the four values ended up transposed relative to what
    Overpass QL actually expects, which sent real searches off searching a huge,
    wrong band across other countries entirely). Clipped to _MAX_BBOX_HALF_SPAN_DEG
    around the center — present even for a plain city so every source tool can use
    one consistent shape."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(NOMINATIM_URL, params={"q": location, "format": "json", "limit": 1}, headers={"User-Agent": "LeadPilot/1.0"})
        resp.raise_for_status()
        data = resp.json()
        if not data:
            raise ValueError(f"Location '{location}' not found via Nominatim")
        result = data[0]
        lat, lon = float(result["lat"]), float(result["lon"])

        south, north, west, east = lat, lat, lon, lon
        raw_bbox = result.get("boundingbox")
        if raw_bbox and len(raw_bbox) == 4:
            # Nominatim's own documented order: [min_lat, max_lat, min_lon, max_lon]
            south, north, west, east = (float(v) for v in raw_bbox)

        lat_half = min(max(north - lat, lat - south, 0.05), _MAX_BBOX_HALF_SPAN_DEG)
        lon_half = min(max(east - lon, lon - west, 0.05), _MAX_BBOX_HALF_SPAN_DEG)
        return {
            "lat": lat,
            "lon": lon,
            "bbox": {"south": lat - lat_half, "west": lon - lon_half, "north": lat + lat_half, "east": lon + lon_half},
        }

# Loose keyword match deciding whether a category reads as IT/tech (routes to GitHub)
# vs a general local business (routes to OSM, with Geoapify as a fallback) — SKILL-
# OUTBOUND.md §1. Simple substring match on purpose: this only needs to be right most
# of the time, not perfect, and stays free/instant (no extra API call to classify it).
_TECH_KEYWORDS = (
    "software", "saas", "it ", "it company", "tech", "developer", "development",
    "ai ", "artificial intelligence", "machine learning", "startup", "app development",
    "web design", "web development", "programmer", "coding", "engineering firm",
)


def is_tech_category(category: str) -> bool:
    c = f" {category.strip().lower()} "
    return any(kw in c for kw in _TECH_KEYWORDS)


# Maps common free-text business categories to the *actual* fixed-vocabulary tag/slug
# each source API uses internally. A loose substring/regex match against the raw
# category text alone misses real listings tagged with vocabulary that shares no
# words with what a person types — e.g. OSM's real-estate tag is `office=estate_agent`
# and Geoapify's is `office.estate_agent`, neither of which contains "real estate"
# anywhere — which is exactly why a "real estate" search came back with zero results
# on both sources. Best-effort, not exhaustive: an unmapped category simply falls back
# to the existing loose-match behavior in osm.py/geoapify.py, unchanged.
CATEGORY_TAG_MAP: dict[str, dict[str, object]] = {
    "real estate": {"osm": [("office", "estate_agent")], "geoapify": "office.estate_agent"},
    "real estate agency": {"osm": [("office", "estate_agent")], "geoapify": "office.estate_agent"},
    "realtor": {"osm": [("office", "estate_agent")], "geoapify": "office.estate_agent"},
    "property dealer": {"osm": [("office", "estate_agent")], "geoapify": "office.estate_agent"},
    "restaurant": {"osm": [("amenity", "restaurant")], "geoapify": "catering.restaurant"},
    "cafe": {"osm": [("amenity", "cafe")], "geoapify": "catering.cafe"},
    "coffee shop": {"osm": [("amenity", "cafe")], "geoapify": "catering.cafe"},
    "bakery": {"osm": [("shop", "bakery")], "geoapify": "commercial.bakery"},
    "bar": {"osm": [("amenity", "bar")], "geoapify": "catering.bar"},
    "pub": {"osm": [("amenity", "pub")], "geoapify": "catering.pub"},
    "dentist": {"osm": [("amenity", "dentist")], "geoapify": "healthcare.dentist"},
    "doctor": {"osm": [("amenity", "doctors")], "geoapify": "healthcare.clinic_or_praxis"},
    "clinic": {"osm": [("amenity", "clinic")], "geoapify": "healthcare.clinic_or_praxis"},
    "hospital": {"osm": [("amenity", "hospital")], "geoapify": "healthcare.hospital"},
    "pharmacy": {"osm": [("amenity", "pharmacy")], "geoapify": "healthcare.pharmacy"},
    "lawyer": {"osm": [("office", "lawyer")], "geoapify": "office.lawyer"},
    "law firm": {"osm": [("office", "lawyer")], "geoapify": "office.lawyer"},
    "gym": {"osm": [("leisure", "fitness_centre")], "geoapify": "sport.fitness"},
    "fitness": {"osm": [("leisure", "fitness_centre")], "geoapify": "sport.fitness"},
    "salon": {"osm": [("shop", "hairdresser")], "geoapify": "commercial.hairdresser"},
    "hair salon": {"osm": [("shop", "hairdresser")], "geoapify": "commercial.hairdresser"},
    "beauty salon": {"osm": [("shop", "beauty")], "geoapify": "commercial.beauty"},
    "spa": {"osm": [("leisure", "spa"), ("shop", "beauty")], "geoapify": "commercial.beauty"},
    "hotel": {"osm": [("tourism", "hotel")], "geoapify": "accommodation.hotel"},
    "bank": {"osm": [("amenity", "bank")], "geoapify": "service.financial.bank"},
    "insurance": {"osm": [("office", "insurance")], "geoapify": "service.financial.insurance"},
    "insurance agency": {"osm": [("office", "insurance")], "geoapify": "service.financial.insurance"},
    "accountant": {"osm": [("office", "accountant")], "geoapify": "office.financial"},
    "accounting firm": {"osm": [("office", "accountant")], "geoapify": "office.financial"},
    "car dealer": {"osm": [("shop", "car")], "geoapify": "commercial.vehicle"},
    "car dealership": {"osm": [("shop", "car")], "geoapify": "commercial.vehicle"},
    "auto repair": {"osm": [("shop", "car_repair")], "geoapify": "service.vehicle"},
    "grocery": {"osm": [("shop", "supermarket")], "geoapify": "commercial.supermarket"},
    "supermarket": {"osm": [("shop", "supermarket")], "geoapify": "commercial.supermarket"},
    "travel agency": {"osm": [("shop", "travel_agency")], "geoapify": "commercial.travel_agency"},
    "photographer": {"osm": [("shop", "photo")], "geoapify": "commercial.photo"},
    "florist": {"osm": [("shop", "florist")], "geoapify": "commercial.florist"},
    "school": {"osm": [("amenity", "school")], "geoapify": "education.school"},
    "university": {"osm": [("amenity", "university")], "geoapify": "education.university"},
    "digital marketing agency": {"osm": [("office", "advertising_agency")], "geoapify": "office.advertising_agency"},
    "marketing agency": {"osm": [("office", "advertising_agency")], "geoapify": "office.advertising_agency"},
    "advertising agency": {"osm": [("office", "advertising_agency")], "geoapify": "office.advertising_agency"},
}


def _lookup_category(category: str) -> dict[str, object] | None:
    c = category.strip().lower()
    for key, mapping in CATEGORY_TAG_MAP.items():
        if key in c or c in key:
            return mapping
    return None


def matching_osm_tags(category: str) -> list[tuple[str, str]]:
    mapping = _lookup_category(category)
    return mapping["osm"] if mapping else []


def matching_geoapify_category(category: str) -> str | None:
    mapping = _lookup_category(category)
    return mapping["geoapify"] if mapping else None


async def fetch_email_from_website(url: str) -> str | None:
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            match = _EMAIL_RE.search(soup.get_text(separator=" "))
            return match.group(0) if match else None
    except Exception:
        return None


async def existing_contact_keys(db: AsyncSession, organization_id: str) -> dict[str, set]:
    """Two dedup key spaces every source tool checks before inserting, so re-running
    the same search twice doesn't pile up duplicates:
    - "contact": (phone, website-or-email) pairs, across outbound_leads and real leads.
    - "name_location": (business_name, location) pairs, lowercased — the fallback for
      records with no phone/website/email at all (common for GitHub profiles, and some
      OSM/Geoapify listings). Without this, a contact-less business had nothing to
      dedupe on and reappeared as a "new" lead on every repeat search.
    """
    out_rows = (
        await db.execute(
            select(OutboundLead.phone, OutboundLead.website, OutboundLead.email, OutboundLead.business_name, OutboundLead.location).where(
                OutboundLead.organization_id == organization_id
            )
        )
    ).all()
    contact_keys = {(row.phone, row.website or row.email) for row in out_rows}
    name_location_keys = {((row.business_name or "").strip().lower(), (row.location or "").strip().lower()) for row in out_rows}
    lead_rows = (
        await db.execute(select(LeadModel.contact_phone, LeadModel.contact_email).where(LeadModel.organization_id == organization_id))
    ).all()
    contact_keys.update((row.contact_phone, row.contact_email) for row in lead_rows)
    return {"contact": contact_keys, "name_location": name_location_keys}


def dedupe_new_records(records: list[dict[str, Any]], existing: dict[str, set]) -> list[dict[str, Any]]:
    new_records = []
    for rec in records:
        key = (rec.get("phone"), rec.get("website") or rec.get("email"))
        if key != (None, None):
            if key in existing["contact"]:
                continue
            new_records.append(rec)
            existing["contact"].add(key)
            continue
        nl_key = ((rec.get("business_name") or "").strip().lower(), (rec.get("location") or "").strip().lower())
        if nl_key in existing["name_location"]:
            continue
        new_records.append(rec)
        existing["name_location"].add(nl_key)
    return new_records
