import { comparisonsFixture, getComparisonBySlug as getBySlug } from "@/lib/fixtures/comparisons";
import type { Comparison } from "@/lib/schema";

export async function getComparisons(): Promise<Comparison[]> {
  return comparisonsFixture;
}

export async function getComparisonBySlug(slug: string): Promise<Comparison | null> {
  return getBySlug(slug);
}
