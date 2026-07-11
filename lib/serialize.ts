/**
 * Serialization helpers for passing Prisma rows from Server Components into
 * Client Components. Prisma `Decimal` values are not serializable across the RSC
 * boundary, so we convert them to plain numbers. Dates are left intact (Next
 * serializes them).
 */

function isDecimal(value: unknown): value is { toNumber(): number } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { constructor?: { name?: string } }).constructor?.name === "Decimal" &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

/** Recursively convert Prisma Decimals to numbers. Arrays/objects are cloned. */
export function serialize<T>(input: T): T {
  return convert(input) as T;
}

function convert(value: unknown): unknown {
  if (isDecimal(value)) return value.toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(convert);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = convert(v);
    return out;
  }
  return value;
}
