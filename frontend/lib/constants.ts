// Cookie name constants shared between middleware (edge runtime, no next/headers)
// and server-only session/overlay helpers — kept dependency-free on purpose.
export const SESSION_COOKIE_NAME = "session_id";
export const OVERLAY_COOKIE_NAME = "lp_overlay";
