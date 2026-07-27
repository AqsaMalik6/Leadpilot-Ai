"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import type { Organization } from "@/lib/schema";

export function OrgSettingsForm({ organization }: { organization: Organization }) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    const res = await fetch("/api/org/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: "Failed to save organization profile", variant: "destructive" });
      return;
    }
    toast({ title: "Organization profile saved" });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="org-name">Organization name</Label>
          <Input id="org-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={save} disabled={submitting || !name}>
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}
