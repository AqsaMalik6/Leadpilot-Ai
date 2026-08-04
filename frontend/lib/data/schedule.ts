import { backendFetch } from "@/lib/backend-fetch";
import { ScheduleEventSchema, type ScheduleEvent } from "@/lib/schema";

export async function getScheduleEvents(): Promise<ScheduleEvent[]> {
  const res = await backendFetch("/api/schedule");
  if (!res.ok) throw new Error(`Failed to load schedule events (${res.status})`);
  const data = await res.json();
  return ScheduleEventSchema.array().parse(data.events);
}

export async function approveScheduleEvent(id: string): Promise<{ ok: true; leadId: string }> {
  const res = await backendFetch(`/api/schedule/${id}/approve`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Failed to approve schedule event ${id} (${res.status})`);
  }
  return res.json();
}

export async function rejectScheduleEvent(id: string): Promise<{ ok: true }> {
  const res = await backendFetch(`/api/schedule/${id}/reject`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to reject schedule event ${id} (${res.status})`);
  return { ok: true };
}
