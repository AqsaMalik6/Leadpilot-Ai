"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { AgentConfigSchema, type AgentConfig } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

export function AgentConfigForm({ config }: { config: AgentConfig }) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<AgentConfig>({ resolver: zodResolver(AgentConfigSchema), defaultValues: config });

  const { fields, append, remove } = useFieldArray({ control, name: "qualifyingQuestions" });
  const active = watch("active");

  async function onSubmit(data: AgentConfig) {
    const res = await fetch("/api/agent/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast({ title: "Failed to save agent configuration", variant: "destructive" });
      return;
    }
    toast({ title: "Agent configuration saved" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Agent status</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{active ? "Active" : "Paused"}</span>
            <Switch checked={active} onCheckedChange={(v) => setValue("active", v)} />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Persona</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="persona">How your agent introduces itself and behaves</Label>
          <Textarea id="persona" className="mt-1.5" rows={3} {...register("persona")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qualifying questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input {...register(`qualifyingQuestions.${i}.prompt` as const)} />
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 text-slate-400 hover:text-red-700"
                aria-label="Remove question"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {fields.length < 8 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ id: `q_${Date.now()}`, field: "need", prompt: "New qualifying question", required: false })
              }
            >
              <Plus className="h-4 w-4" /> Add question
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Handoff threshold: {watch("handoffThreshold")}/100</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="range"
            min={0}
            max={100}
            {...register("handoffThreshold", { valueAsNumber: true })}
            className="w-full accent-signal-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Conversations scoring at or above this threshold are booked directly; below it, they&apos;re
            closed or routed to nurture.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendly link</CardTitle>
        </CardHeader>
        <CardContent>
          <Input {...register("calendlyUrl")} />
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting} size="lg">
        Save configuration
      </Button>
    </form>
  );
}
