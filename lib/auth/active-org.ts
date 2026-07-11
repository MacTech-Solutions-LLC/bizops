/** Cookie that records an operator's selected organization server-side.
 * Kept in a plain module (not the "use server" actions file, which may only
 * export async functions). */
export const ACTIVE_ORG_COOKIE = "gc_active_org";
