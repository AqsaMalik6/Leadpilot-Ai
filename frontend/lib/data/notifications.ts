import { backendFetch } from "@/lib/backend-fetch";
import { NotificationSchema, type Notification } from "@/lib/schema";

export type NotificationRules = Record<string, Record<string, boolean>>;

export async function getNotifications(): Promise<Notification[]> {
  const res = await backendFetch("/api/notifications");
  if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
  const data = await res.json();
  return NotificationSchema.array().parse(data.notifications);
}

export async function getNotificationRules(): Promise<NotificationRules> {
  const res = await backendFetch("/api/notifications");
  if (!res.ok) throw new Error(`Failed to load notification rules (${res.status})`);
  const data = await res.json();
  return data.rules ?? {};
}
