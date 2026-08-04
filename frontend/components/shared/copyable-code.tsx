"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: "Link copied" });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-950">{value}</code>
      <Button variant="outline" size="sm" onClick={copy}>
        <Copy className="h-3.5 w-3.5" />
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
