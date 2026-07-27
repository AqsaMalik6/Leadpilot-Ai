"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { DemoScript, DemoScriptStep } from "@/lib/schema";

export type StreamStatus = "idle" | "playing" | "done";

/**
 * Client-side simulated streaming over a scripted fixture conversation — no network
 * calls (SKILL-FRONTEND.md §8 Phase 3). Functionally identical to a real streamed
 * agent reply from the user's point of view; the real API call is a drop-in swap
 * once the backend exists (§4.3).
 */
export function useSimulatedStream(script: DemoScript | null) {
  const shouldReduceMotion = useReducedMotion();
  const [visibleSteps, setVisibleSteps] = useState<DemoScriptStep[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const play = useCallback(() => {
    if (!script) return;
    setVisibleSteps([]);
    setStatus("playing");
  }, [script]);

  const reset = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisibleSteps([]);
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (status !== "playing" || !script) return;

    if (visibleSteps.length >= script.steps.length) {
      setStatus("done");
      return;
    }

    const next = script.steps[visibleSteps.length];
    const delay = shouldReduceMotion ? 50 : (next?.delayMs ?? 1000);

    timeoutRef.current = setTimeout(() => {
      setVisibleSteps((prev) => [...prev, next!]);
    }, delay);

    return () => clearTimeout(timeoutRef.current);
  }, [status, visibleSteps, script, shouldReduceMotion]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return { visibleSteps, status, play, reset };
}
