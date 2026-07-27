import { z } from "zod";

export const IntegrationProviderSchema = z.enum([
  "whatsapp",
  "email",
  "website_form",
  "calendly",
  "slack",
  "hubspot",
]);
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;

export const IntegrationSchema = z.object({
  id: z.string(),
  provider: IntegrationProviderSchema,
  label: z.string(),
  description: z.string(),
  logoSrc: z.string().nullable(),
  status: z.enum(["connected", "not_connected", "error"]),
  connectedAt: z.string().nullable(),
  configHref: z.string(),
});
export type Integration = z.infer<typeof IntegrationSchema>;
