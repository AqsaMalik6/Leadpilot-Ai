import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotificationRulesForm } from "@/components/dashboard/notification-rules-form";
import { getNotificationRules, getNotifications } from "@/lib/data/notifications";
import { formatDate } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  lead_qualified: "Lead qualified",
  lead_booked: "Call booked",
  lead_rejected: "Lead rejected",
  weekly_summary: "Weekly summary",
  lead_cold: "Lead went cold",
};

export default async function NotificationsPage() {
  const [notifications, rules] = await Promise.all([getNotifications(), getNotificationRules()]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Notifications</h1>
        <p className="text-sm text-slate-500">Choose what triggers a Slack message or email to your team.</p>
      </div>

      <NotificationRulesForm initialRules={rules} />

      <div>
        <h2 className="font-display text-lg font-semibold text-ink-950">Recent notifications</h2>
        <Card className="mt-3">
          <CardHeader className="sr-only">
            <CardTitle>Recent notifications</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line p-0">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No notifications sent yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-medium text-ink-950">{TYPE_LABELS[n.type] ?? n.type}</div>
                    <div className="text-xs text-slate-500">
                      {n.channel} · {formatDate(n.createdAt)}
                    </div>
                  </div>
                  <Badge variant={n.status === "sent" ? "qualified" : n.status === "failed" ? "rejected" : "neutral"}>
                    {n.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
