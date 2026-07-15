/**
 * Partial-date parsing for resume-derived values. Pure; never throws.
 *
 * Resumes state dates in prose, not ISO: "2019 - Present", "June 2019",
 * "06/2019", "Summer 2012". These values reach us from a *machine extraction*,
 * not from the member's keyboard — so a string we can't read is our problem to
 * absorb, not theirs to correct. Hence the contract:
 *
 *   readable  → Date (normalised to the first of the month/year)
 *   "current" → null   ("Present"/"Current"/... means the role is ongoing,
 *                       and null endedOn is exactly how the schema says that)
 *   garbage   → null   (drop the field, keep the row)
 *
 * The previous strict version rejected the whole submission when any single
 * date failed, which blocked a member from saving their entire profile because
 * the model wrote "Present" instead of null — in a review UI that has no date
 * input to fix it in. An optional field must never be able to do that.
 *
 * What we will NOT do is invent precision. `new Date("Summer 2019")` silently
 * yields 1 January 2019 in V8; that's a guess wearing a timestamp. We extract
 * the stated year and nothing more, and anything without a plausible year
 * becomes null rather than a fabricated date.
 */

/** Words a resume uses to mean "this is still going". */
const ONGOING = /^(?:present|current|now|ongoing|to\s*date|date|today)$/i;

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/** Bounds a plausible career date; also rejects a stray "40 hours" style number. */
const MIN_YEAR = 1940;
const MAX_YEAR = 2100;

const utc = (year: number, month = 1, day = 1): Date =>
  new Date(Date.UTC(year, month - 1, day));

const validYear = (y: number) => y >= MIN_YEAR && y <= MAX_YEAR;
const validMonth = (m: number) => m >= 1 && m <= 12;

/**
 * Parse a resume-style partial date.
 *
 * @returns a Date, or null for "ongoing", empty, and unreadable input. Never throws.
 */
export function parsePartialDate(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;

  const raw = input.trim();
  if (raw === "") return null;

  // "Present" and friends — including when the model hands back a whole range
  // ("2019 - Present") in the endedOn field. Ongoing wins over the year that
  // precedes it: the role has no end date, so null is the correct answer, not
  // 2019. Checked before year extraction for exactly that reason.
  if (ONGOING.test(raw)) return null;
  if (/\b(?:present|current|ongoing|to\s*date)\b/i.test(raw)) return null;

  // ISO-ish: YYYY-MM-DD / YYYY/MM/DD
  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(raw);
  if (ymd) {
    const [y, m, d] = [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])];
    if (validYear(y) && validMonth(m) && d >= 1 && d <= 31) return utc(y, m, d);
    return null;
  }

  // YYYY-MM / YYYY/MM
  const ym = /^(\d{4})[-/](\d{1,2})$/.exec(raw);
  if (ym) {
    const [y, m] = [Number(ym[1]), Number(ym[2])];
    if (validYear(y) && validMonth(m)) return utc(y, m);
    return null;
  }

  // MM/YYYY or M-YYYY
  const my = /^(\d{1,2})[-/](\d{4})$/.exec(raw);
  if (my) {
    const [m, y] = [Number(my[1]), Number(my[2])];
    if (validYear(y) && validMonth(m)) return utc(y, m);
    return null;
  }

  // "June 2019", "Jun 2019", "June, 2019"
  const monthYear = /^([a-z]+)\.?,?\s+(\d{4})$/i.exec(raw);
  if (monthYear) {
    const m = MONTHS[monthYear[1].toLowerCase()];
    const y = Number(monthYear[2]);
    if (m && validYear(y)) return utc(y, m);
    // Not a month name ("Summer 2019") — fall through to year extraction rather
    // than inventing January the way `new Date` would.
  }

  // Bare year.
  const bare = /^(\d{4})$/.exec(raw);
  if (bare && validYear(Number(bare[1]))) return utc(Number(bare[1]));

  // Last resort: a plausible year somewhere in the string ("Summer 2019",
  // "2019-2021"). Take the LAST one — for a range in an end-date field, the end
  // is what's being asked for. Year only; we don't guess the month.
  const years = [...raw.matchAll(/\b(\d{4})\b/g)]
    .map((m) => Number(m[1]))
    .filter(validYear);
  if (years.length > 0) return utc(years[years.length - 1]);

  return null;
}
