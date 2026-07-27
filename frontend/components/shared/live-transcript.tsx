"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranscriptMessage } from "@/lib/schema";
import type { DemoScriptStep } from "@/lib/schema";

export interface LiveTranscriptMessage {
  id: string;
  role: "lead" | "agent" | "system";
  text: string;
  delayMs?: number;
}

interface LiveTranscriptProps {
  messages: LiveTranscriptMessage[] | TranscriptMessage[] | DemoScriptStep[];
  loop?: boolean;
  autoPlay?: boolean;
  className?: string;
  onComplete?: () => void;
  agentName?: string;
}

/**
 * Animated chat-bubble replay of an AI qualification conversation. Reused verbatim
 * between the marketing hero loop and the real dashboard lead-detail transcript
 * (SKILL-FRONTEND.md §2.5) — same component, different message source.
 */
export function LiveTranscript({
  messages,
  loop = false,
  autoPlay = true,
  className,
  onComplete,
  agentName = "LeadPilot",
}: LiveTranscriptProps) {
  const shouldReduceMotion = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(autoPlay ? 0 : messages.length);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setVisibleCount(autoPlay ? 0 : messages.length);
  }, [messages, autoPlay]);

  useEffect(() => {
    if (!autoPlay) return;

    if (visibleCount >= messages.length) {
      if (loop) {
        timeoutRef.current = setTimeout(() => setVisibleCount(0), 2200);
      } else {
        onComplete?.();
      }
      return;
    }

    const nextMessage = messages[visibleCount];
    const delay = shouldReduceMotion ? 60 : ((nextMessage as { delayMs?: number })?.delayMs ?? 1200);

    timeoutRef.current = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, Math.max(delay, 60));

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount, messages, autoPlay, loop, shouldReduceMotion]);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount]);

  const visible = messages.slice(0, visibleCount);

  return (
    <div
      ref={containerRef}
      className={cn("flex max-h-full flex-col gap-3 overflow-y-auto px-1 py-1", className)}
      role="log"
      aria-live="polite"
      aria-label="AI qualification conversation transcript"
    >
      <AnimatePresence initial={false}>
        {visible.map((message) => (
          <motion.div
            key={message.id}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.25 }}
            className={cn(
              "flex items-end gap-2",
              message.role === "lead" ? "flex-row-reverse" : "flex-row",
              message.role === "system" && "justify-center",
            )}
          >
            {message.role === "system" ? (
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-slate-500">{message.text}</span>
            ) : (
              <>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    message.role === "agent" ? "bg-signal-500 text-ink-950" : "bg-ink-900 text-white",
                  )}
                >
                  {message.role === "agent" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </span>
                <span
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-snug",
                    message.role === "agent"
                      ? "rounded-bl-sm bg-ink-950 text-white"
                      : "rounded-br-sm bg-surface-2 text-ink-950",
                  )}
                >
                  {message.role === "agent" && (
                    <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-signal-500">
                      {agentName}
                    </span>
                  )}
                  {message.text}
                </span>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
