"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginInputSchema, type LoginInput } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginInputSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
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
    const plan = searchParams.get("plan");
    // A plan param means they arrived from pricing but already had an account —
    // still show the real checkout confirmation before dropping them at the
    // dashboard, same as a brand-new signup would get.
    const next = plan ? `/checkout?plan=${encodeURIComponent(plan)}` : (searchParams.get("next") ?? "/dashboard");
    router.push(next);
    router.refresh();
  }

  return (
    <Card className="relative z-10 w-full max-w-sm">
      <CardHeader>
        <h1 className="font-display text-2xl font-bold text-ink-950">Log in</h1>
        <p className="text-sm text-slate-500">Welcome back — enter your details to access your dashboard.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" className="mt-1.5" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="login-password">Password</Label>
            <PasswordInput id="login-password" className="mt-1.5" {...register("password")} />
            {errors.password && <p className="mt-1 text-xs text-red-700">{errors.password.message}</p>}
          </div>
          {serverError && (
            <p className="flex items-center gap-1.5 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5" /> {serverError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Log in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          No account yet?{" "}
          <Link
            href={searchParams.get("plan") ? `/signup?plan=${encodeURIComponent(searchParams.get("plan")!)}` : "/signup"}
            className="font-medium text-signal-600 hover:underline"
          >
            Start a free trial
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
