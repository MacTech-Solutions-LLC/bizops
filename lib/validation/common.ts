import { z } from "zod";

/**
 * Partial-update semantics: an ABSENT field resolves to `undefined` (the caller
 * omits it from the write), while an explicit empty string resolves to `null`
 * (the caller clears it). Services strip `undefined` before writing so untouched
 * fields are never overwritten.
 */

/** Optional text; "" → undefined (leaves field untouched on update). */
export const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

/** Nullable text; absent → undefined (omit), "" → null (clear), value → value. */
export const optionalNullableText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "" ? null : v));

/** Date; absent → undefined, "" / null → null, else Date. */
export const optionalDate = z
  .union([z.coerce.date(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v instanceof Date ? v : null));

/** Number; absent → undefined, "" / null → null, else finite number.
 *
 * `z.null()` MUST precede `z.coerce.number()`: a union returns the first branch
 * that succeeds, and `z.coerce.number()` accepts null by coercing it to 0
 * (`Number(null) === 0`). With the old ordering an explicit null — meaning
 * "unknown" — was silently stored as a real, asserted zero. */
export const optionalNumber = z
  .union([z.null(), z.literal(""), z.coerce.number()])
  .optional()
  .transform((v) =>
    v === undefined ? undefined : typeof v === "number" && Number.isFinite(v) ? v : null,
  );

/** Integer percentage 0..100; absent → undefined, "" / null → null. */
export const optionalPercent = z
  .union([z.coerce.number().int().min(0).max(100), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : typeof v === "number" ? v : null));

/** String array; absent → undefined, else splits comma-separated input. */
export const stringArray = z
  .union([z.array(z.string()), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean);
    if (typeof v === "string")
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return [];
  });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export type Pagination = z.infer<typeof paginationSchema>;
