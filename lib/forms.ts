/** Convert a FormData into a plain object. Empty strings are preserved so
 * partial-update validators can distinguish "clear" ("") from "omit" (absent).
 * Framework-internal keys (prefixed "$") are skipped. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
