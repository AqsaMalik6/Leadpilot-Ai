"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignupInputSchema, type SignupInput } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(SignupInputSchema) });

  async function onSubmit(data: SignupInput) {
    setServerError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(
        body?.errors?.formErrors?.[0] ?? body?.errors?.fieldErrors?.email?.[0] ?? "Something went wrong. Please try again.",
      );
      return;
    }
    router.push(plan ? `/checkout?plan=${encodeURIComponent(plan)}` : "/checkout");
    router.refresh();
  }

  return (
    <Card className="relative z-10 w-full max-w-sm">
      <CardHeader>
        <h1 className="font-display text-2xl font-bold text-ink-950">Start your free trial</h1>
        <p className="text-sm text-slate-500">No credit card required.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="signup-name">Full name</Label>
            <Input id="signup-name" className="mt-1.5" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="signup-company">Company</Label>
            <Input id="signup-company" className="mt-1.5" {...register("company")} />
            {errors.company && <p className="mt-1 text-xs text-red-700">{errors.company.message}</p>}
          </div>
          <div>
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" className="mt-1.5" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="signup-password">Password</Label>
            <PasswordInput id="signup-password" className="mt-1.5" {...register("password")} />
            {errors.password && <p className="mt-1 text-xs text-red-700">{errors.password.message}</p>}
            <p className="mt-1 text-xs text-slate-400">8+ characters, one uppercase letter, one number.</p>
          </div>
          {serverError && (
            <p className="flex items-center gap-1.5 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5" /> {serverError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href={plan ? `/login?plan=${encodeURIComponent(plan)}` : "/login"} className="font-medium text-signal-600 hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
