"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DemoLeadInputSchema, type DemoLeadInput } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function DemoLeadForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (data: DemoLeadInput) => void;
  submitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DemoLeadInput>({ resolver: zodResolver(DemoLeadInputSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="demo-name">Your name</Label>
          <Input id="demo-name" className="mt-1.5" placeholder="Jordan Ellis" {...register("name")} />
          {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="demo-company">Company</Label>
          <Input id="demo-company" className="mt-1.5" placeholder="Acme Co." {...register("company")} />
          {errors.company && <p className="mt-1 text-xs text-red-700">{errors.company.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="demo-need">What are you looking for?</Label>
        <Input
          id="demo-need"
          className="mt-1.5"
          placeholder="e.g. faster response to website leads"
          {...register("need")}
        />
        {errors.need && <p className="mt-1 text-xs text-red-700">{errors.need.message}</p>}
      </div>
      <Button type="submit" disabled={submitting} className="self-start">
        <Send className="h-4 w-4" />
        Submit a fake lead
      </Button>
    </form>
  );
}
