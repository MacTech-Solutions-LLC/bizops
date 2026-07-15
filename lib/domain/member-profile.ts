/**
 * Member profile predicates — pure, no I/O.
 */

import type { StoredProfile } from "@/lib/profile/edit-payload";

/**
 * Has this profile been filled in at all?
 *
 * Drives whether "My Profile" opens on the upload wizard or on the profile
 * itself. Deliberately not `completeness > 0`: the clearance factor scores a
 * flat 15 for an untouched draft (answering "none" is a legitimate answer), so
 * a brand-new profile is never at zero and that test would show every member a
 * profile page with nothing on it.
 *
 * `clearanceLevel` is excluded for the same reason — its default is `none`, and
 * a default is not evidence that anyone typed anything.
 */
export function isProfileStarted(profile: StoredProfile): boolean {
  return Boolean(
    profile.headline ||
      profile.summary ||
      profile.laborCategory ||
      profile.yearsExperience != null ||
      profile.skills.length > 0 ||
      profile.certifications.length > 0 ||
      profile.education.length > 0 ||
      profile.experience.length > 0,
  );
}
