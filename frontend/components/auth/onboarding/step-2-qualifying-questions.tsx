"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { QualifyingQuestion } from "@/lib/schema";

export function Step2QualifyingQuestions({
  questions,
  onChange,
}: {
  questions: QualifyingQuestion[];
  onChange: (questions: QualifyingQuestion[]) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-ink-950">Define your qualifying questions</h2>
      <p className="mt-1 text-sm text-slate-500">
        We&apos;ve pre-filled sensible defaults — edit them to match how your team actually qualifies leads.
      </p>
      <div className="mt-6 space-y-3">
        {questions.map((question, i) => (
          <div key={question.id} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
            <Input
              value={question.prompt}
              onChange={(e) => {
                const next = [...questions];
                next[i] = { ...next[i]!, prompt: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(questions.filter((_, idx) => idx !== i))}
              className="shrink-0 text-slate-400 hover:text-red-700"
              aria-label="Remove question"
              disabled={questions.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        disabled={questions.length >= 8}
        onClick={() =>
          onChange([
            ...questions,
            { id: `q_${questions.length}_${Math.random().toString(36).slice(2, 8)}`, field: "need", prompt: "New qualifying question", required: false },
          ])
        }
      >
        Add a question
      </Button>
    </div>
  );
}
