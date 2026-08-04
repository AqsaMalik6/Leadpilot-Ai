"""Parses Calendly's own notification emails (New Event / Rescheduled Event / Canceled
Event) as they arrive in a connected Gmail inbox. This is the only way to detect a real
booking without a public webhook URL (app/routers/webhooks_calendly.py needs one Calendly
can POST to, which localhost can't provide) — Calendly's plain-text notification emails
carry the same facts, just formatted for a human to read instead of as JSON.

Real, not a stub: field extraction below is regex-matched against Calendly's actual
notification email layout (verified against a real "New Event" email). Reschedule/cancel
emails follow the same "Label:\nvalue" layout Calendly uses throughout its notifications,
just with a different subject prefix and, for reschedules, an optional reason line.
"""

import logging
import re
from datetime import datetime

logger = logging.getLogger("leadpilot.calendly_email_parser")

CALENDLY_SENDER_DOMAIN = "calendly.com"

_KIND_BY_SUBJECT_PREFIX = [
    (re.compile(r"cancell?ed event", re.IGNORECASE), "canceled"),
    (re.compile(r"reschedul", re.IGNORECASE), "rescheduled"),
    (re.compile(r"new event", re.IGNORECASE), "created"),
]

_FIELD_PATTERNS = {
    "event_type_name": re.compile(r"Event Type:\s*\n\s*(.+)"),
    "invitee_name": re.compile(r"Invitee:\s*\n\s*(.+)"),
    "invitee_email": re.compile(r"Invitee Email:\s*\n\s*([^\s]+@[^\s]+)"),
    "event_datetime": re.compile(r"Event Date/Time:\s*\n\s*(.+)"),
    "reason": re.compile(r"Reason (?:for (?:rescheduling|cancell?ation)):?\s*\n\s*(.+)", re.IGNORECASE),
}

# "09:00 - Thursday, 30 July 2026 (Pakistan, Maldives Time)" — Calendly always spells
# the month out and always includes a timezone name in parens, which %Z can't parse
# generically, so it's stripped before strptime rather than guessing a tz mapping.
_EVENT_DATETIME_RE = re.compile(r"(\d{1,2}:\d{2})\s*-\s*\w+,\s*(\d{1,2}\s+\w+\s+\d{4})")

_DURATION_RE = re.compile(r"(\d+)\s*Minute", re.IGNORECASE)


def is_calendly_notification(from_email: str) -> bool:
    return bool(from_email) and CALENDLY_SENDER_DOMAIN in from_email.lower()


def _detect_kind(subject: str) -> str:
    for pattern, kind in _KIND_BY_SUBJECT_PREFIX:
        if pattern.search(subject):
            return kind
    return "created"


def _parse_event_start(event_datetime_text: str) -> datetime | None:
    match = _EVENT_DATETIME_RE.search(event_datetime_text)
    if not match:
        return None
    time_part, date_part = match.groups()
    try:
        return datetime.strptime(f"{date_part} {time_part}", "%d %B %Y %H:%M")
    except ValueError:
        logger.warning("calendly_email_parser: couldn't parse event datetime %r", event_datetime_text)
        return None


def parse_calendly_notification(subject: str, body_text: str) -> dict | None:
    """Returns None if this doesn't look like a real Calendly booking notification (a
    generic marketing email from Calendly's own domain, for instance) — every field
    below is required for the result to be usable, so partial matches are rejected
    rather than creating a half-populated CalendlyBookingEvent row."""
    invitee_name_m = _FIELD_PATTERNS["invitee_name"].search(body_text)
    invitee_email_m = _FIELD_PATTERNS["invitee_email"].search(body_text)
    event_datetime_m = _FIELD_PATTERNS["event_datetime"].search(body_text)
    if not (invitee_name_m and invitee_email_m and event_datetime_m):
        return None

    event_start = _parse_event_start(event_datetime_m.group(1))
    if event_start is None:
        return None

    event_type_m = _FIELD_PATTERNS["event_type_name"].search(body_text)
    event_type_name = event_type_m.group(1).strip() if event_type_m else None
    duration_m = _DURATION_RE.search(event_type_name or "")
    duration_minutes = int(duration_m.group(1)) if duration_m else 30

    reason_m = _FIELD_PATTERNS["reason"].search(body_text)

    return {
        "kind": _detect_kind(subject),
        "invitee_name": invitee_name_m.group(1).strip(),
        "invitee_email": invitee_email_m.group(1).strip(),
        "event_type_name": event_type_name,
        "event_start": event_start,
        "duration_minutes": duration_minutes,
        "reschedule_reason": reason_m.group(1).strip() if reason_m else None,
    }
