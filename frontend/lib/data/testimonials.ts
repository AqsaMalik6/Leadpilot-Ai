import { backendFetch } from "@/lib/backend-fetch";
import { CaseStudySchema, TestimonialSchema, type CaseStudy, type Testimonial } from "@/lib/schema";

export async function getTestimonials(): Promise<Testimonial[]> {
  const res = await backendFetch("/api/cms/testimonials");
  if (!res.ok) throw new Error("Failed to load testimonials");
  const body = await res.json();
  return body.testimonials.map((t: unknown) => TestimonialSchema.parse(t));
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
  const res = await backendFetch("/api/cms/case-studies");
  if (!res.ok) throw new Error("Failed to load case studies");
  const body = await res.json();
  return body.caseStudies.map((c: unknown) => CaseStudySchema.parse(c));
}

export async function getCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  const res = await backendFetch(`/api/cms/case-studies/${slug}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load case study");
  return CaseStudySchema.parse(await res.json());
}
