import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrgSettingsForm } from "@/components/dashboard/org-settings-form";
import { getOrgSettings } from "@/lib/data/org";

export default async function SettingsPage() {
  const organization = await getOrgSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Settings</h1>
        <p className="text-sm text-slate-500">Organization profile and account controls.</p>
      </div>

      <OrgSettingsForm organization={organization} />

      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-700">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-ink-950">Delete organization</div>
            <p className="text-sm text-slate-500">Permanently deletes all leads, configuration, and team access.</p>
          </div>
          <Button variant="destructive" disabled title="Not available yet — no backend endpoint for this">
            Delete organization
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
