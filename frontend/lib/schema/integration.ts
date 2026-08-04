import { z } from "zod";

export const IntegrationProviderSchema = z.enum([
  "whatsapp",
  "email",
  "website_form",
  "calendly",
  "slack",
  "hubspot",
  "gmail",
  // SKILL-MULTI-TENANT-CONNECT.md §3 — the self-serve QR/Baileys WhatsApp connect,
  // distinct from the legacy single-tenant "whatsapp" lead_channel row above.
  "whatsapp_qr",
]);
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;

export const IntegrationSchema = z.object({
  id: z.string(),
  provider: IntegrationProviderSchema,
  label: z.string(),
  description: z.string(),
  logoSrc: z.string().nullable(),
  // qr_pending/disconnected/banned only ever appear on the whatsapp_qr provider row.
  // reconnect_needed only ever appears on the gmail provider row (a token refresh
  // failure — see app/services/gmail_service.py).
  status: z.enum(["connected", "not_connected", "error", "qr_pending", "disconnected", "banned", "reconnect_needed"]),
  connectedAt: z.string().nullable(),
  configHref: z.string(),
  // gmail-only: when it last successfully synced, and (if status=reconnect_needed)
  // why. Optional since every other provider's list_integrations entry omits them.
  lastSyncedAt: z.string().nullable().optional(),
  lastStatusMessage: z.string().nullable().optional(),
});
export type Integration = z.infer<typeof IntegrationSchema>;
