"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lead } from "@/lib/schema";

export type LiveLeadStatus = "idle" | "waiting" | "done" | "error";

const POLL_MS = 1500;
const MAX_MS = 30000;
const STABLE_POLLS_TO_STOP = 3;

/**
 * Polls a real lead/transcript endpoint until the live Groq pipeline has produced
 * a reply and reached a decision (or a timeout), instead of replaying a canned
 * script — used by LiveDemoWidget for both the public /demo page and onboarding
 * step 4.
 */
export function useLiveLead() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [status, setStatus] = useState<LiveLeadStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const start = useCallback(
    (fetchLead: () => Promise<Lead | null>) => {
      stop();
      setLead(null);
      setStatus("waiting");
      const startedAt = Date.now();
      let lastCount = 0;
      let stableRounds = 0;

      timerRef.current = setInterval(async () => {
        const result = await fetchLead();
        const elapsed = Date.now() - startedAt;

        if (!result) {
          if (elapsed > MAX_MS) {
            setStatus("error");
            stop();
          }
          return;
        }

        setLead(result);
        const count = result.transcript.length;

        if (count >= 2 && result.status !== "new") {
          setStatus("done");
          stop();
          return;
        }

        if (count === lastCount) {
          stableRounds += 1;
        } else {
          stableRounds = 0;
          lastCount = count;
        }

        if (count >= 2 && stableRounds >= STABLE_POLLS_TO_STOP) {
          setStatus("done");
          stop();
          return;
        }

        if (elapsed > MAX_MS) {
          setStatus("done");
          stop();
        }
      }, POLL_MS);
    },
    [stop],
  );

  const reset = useCallback(() => {
    stop();
    setLead(null);
    setStatus("idle");
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { lead, status, start, reset };
}
