"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import type { SseEvent } from "@/lib/schema";

/**
 * Subscribes to the real SSE endpoint (app/api/leads/stream) and surfaces a toast
 * the moment a new lead comes in — a genuine EventSource, not a client-side
 * setInterval fake (SKILL-FRONTEND.md §4).
 */
export function LiveLeadToaster() {
  const queryClient = useQueryClient();
  const hasShownRef = useRef(false);

  useEffect(() => {
    const source = new EventSource("/api/leads/stream");

    source.onmessage = (event) => {
      const parsed: SseEvent = JSON.parse(event.data);
      if (parsed.type === "new_lead" && !hasShownRef.current) {
        hasShownRef.current = true;
        toast({
          title: "New lead came in",
          description: `${parsed.lead.name} just messaged via ${parsed.lead.channel.replace("_", " ")}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      }
    };

    return () => source.close();
  }, [queryClient]);

  return null;
}
