import { z } from "zod";
import { ValidationError } from "@/lib/errors";

/**
 * Parse input with a Zod schema, throwing a structured `ValidationError`
 * (field-level issues, 422) instead of a raw ZodError. Keeps route/service code
 * free of Zod error plumbing.
 */
export function parseOrThrow<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issues: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "_";
    (issues[path] ??= []).push(issue.message);
  }
  throw new ValidationError("Validation failed", { issues });
}
