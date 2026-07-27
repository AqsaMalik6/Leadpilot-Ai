"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContactInputSchema, type ContactInput } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(ContactInputSchema) });

  async function onSubmit(data: ContactInput) {
    await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-2 p-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-signal-600" />
        <h2 className="font-display text-lg font-semibold text-ink-950">Message sent</h2>
        <p className="text-sm text-slate-500">We&apos;ll get back to you within one business day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" className="mt-1.5" {...register("name")} />
          {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" type="email" className="mt-1.5" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="contact-company">Company (optional)</Label>
        <Input id="contact-company" className="mt-1.5" {...register("company")} />
      </div>
      <div>
        <Label htmlFor="contact-message">Message</Label>
        <Textarea id="contact-message" className="mt-1.5" rows={5} {...register("message")} />
        {errors.message && <p className="mt-1 text-xs text-red-700">{errors.message.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting} size="lg">
        Send message
      </Button>
    </form>
  );
}
