import { z } from "zod";

// Dormant until the FastAPI backend exists (SKILL-FRONTEND.md §4.1, §4.6).
// Once it does, lib/data/* functions call this instead of reading lib/fixtures/*
// — the function signatures in lib/data/* are designed to stay unchanged.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit,
): Promise<z.infer<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    throw new ApiError(`Request to ${path} failed`, res.status);
  }

  const json = await res.json();
  return schema.parse(json);
}
