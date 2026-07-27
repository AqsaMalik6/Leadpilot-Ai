"use client";

import { Globe, MessageCircle, Mail, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { id: "website_form", label: "Website form", description: "Embed a snippet to route form submissions to LeadPilot.", icon: Globe },
  { id: "whatsapp", label: "WhatsApp Business", description: "Reply to inbound WhatsApp messages instantly.", icon: MessageCircle },
  { id: "email", label: "Email inbox", description: "Forward or connect a shared inbox.", icon: Mail },
];

export function Step1ConnectChannel({ value, onChange }: { value: string; onChange: (channel: string) => void }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-ink-950">Connect your first lead channel</h2>
      <p className="mt-1 text-sm text-slate-500">
        You can connect more channels later from Dashboard → Integrations.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {CHANNELS.map((channel) => (
          <button
            key={channel.id}
            type="button"
            onClick={() => onChange(channel.id)}
            className={cn(
              "relative rounded-xl border p-4 text-left transition-colors",
              value === channel.id ? "border-signal-500 bg-signal-500/5" : "border-line hover:bg-surface-2",
            )}
          >
            {value === channel.id && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-signal-500 text-ink-950">
                <Check className="h-3 w-3" />
              </span>
            )}
            <channel.icon className="h-5 w-5 text-signal-600" />
            <div className="mt-2 text-sm font-medium text-ink-950">{channel.label}</div>
            <div className="mt-1 text-xs text-slate-500">{channel.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
