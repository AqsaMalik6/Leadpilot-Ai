import { industriesFixture, getIndustryBySlug as getBySlug } from "@/lib/fixtures/industries";
import type { Industry } from "@/lib/schema";

export async function getIndustries(): Promise<Industry[]> {
  return industriesFixture;
}

export async function getIndustryBySlug(slug: string): Promise<Industry | null> {
  return getBySlug(slug);
}
