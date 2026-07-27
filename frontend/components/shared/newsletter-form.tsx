"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const NewsletterSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type NewsletterInput = z.infer<typeof NewsletterSchema>;

export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterInput>({ resolver: zodResolver(NewsletterSchema) });

  async function onSubmit() {
    await new Promise((r) => setTimeout(r, 500));
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="flex items-center gap-2 text-sm text-signal-500">
        <CheckCircle2 className="h-4 w-4" /> You&apos;re subscribed — thanks for following along.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
      noValidate
    >
      <div className="flex-1 sm:max-w-xs">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <Input
          id="newsletter-email"
          type="email"
          placeholder="you@company.com"
          className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "newsletter-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="newsletter-email-error" className="mt-1 text-xs text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting} className="shrink-0">
        Get product updates
      </Button>
    </form>
  );
}
