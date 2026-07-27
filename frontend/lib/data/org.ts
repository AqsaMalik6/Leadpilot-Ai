import { backendFetch } from "@/lib/backend-fetch";
import { OrganizationSchema, type Organization } from "@/lib/schema";

export async function getOrgSettings(): Promise<Organization> {
  const res = await backendFetch("/api/org");
  if (!res.ok) throw new Error(`Failed to load organization (${res.status})`);
  const data = await res.json();
  return OrganizationSchema.parse(data.organization);
}
