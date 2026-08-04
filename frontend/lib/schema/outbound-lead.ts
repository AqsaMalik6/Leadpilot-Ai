import { z } from "zod";

export const OutboundSourceSchema = z.enum(["osm", "geoapify", "github"]);
export type OutboundSource = z.infer<typeof OutboundSourceSchema>;

export const OutboundStatusSchema = z.enum(["found", "added_to_campaign", "contacted", "rejected"]);
export type OutboundStatus = z.infer<typeof OutboundStatusSchema>;

export const OutboundLeadSchema = z.object({
  id: z.string(),
  businessName: z.string(),
  category: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  email: z.string().nullable(),
  location: z.string().nullable(),
  techStack: z.array(z.string()).nullable(),
  githubOrgOrUser: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  source: OutboundSourceSchema,
  status: OutboundStatusSchema,
  foundAt: z.string().nullable(),
});
export type OutboundLead = z.infer<typeof OutboundLeadSchema>;
