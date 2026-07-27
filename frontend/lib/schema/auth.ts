import { z } from "zod";

export const LoginInputSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const SignupInputSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  company: z.string().min(2, "Enter your company name"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});
export type SignupInput = z.infer<typeof SignupInputSchema>;

export const SessionUserSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["owner", "admin", "sales_rep"]),
  onboardingCompletedAt: z.string().nullable(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const ContactInputSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email address"),
  company: z.string().optional(),
  message: z.string().min(10, "Tell us a little more (10+ characters)"),
});
export type ContactInput = z.infer<typeof ContactInputSchema>;

export const DemoLeadInputSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  company: z.string().min(2, "Enter your company"),
  need: z.string().min(5, "Tell the agent what you're looking for"),
});
export type DemoLeadInput = z.infer<typeof DemoLeadInputSchema>;
