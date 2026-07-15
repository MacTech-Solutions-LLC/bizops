import "./_env";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hasDatabase } from "./_env";
import { prisma } from "@/lib/db/prisma";
import { makeGovConContext } from "@/lib/authz";
import { GOVCON_PERMISSIONS } from "@/lib/permissions/govcon";
import { AuthzError } from "@/lib/errors";
import {
  applyResumeProposal,
  findProfile,
  getOrCreateProfile,
  listPublishedProfiles,
  publishProfile,
  updateProfile,
} from "@/lib/services/member-profile";

const TENANT_A = `test_profile_a_${process.pid}`;
const TENANT_B = `test_profile_b_${process.pid}`;

const MEMBER = "user_member";
const OTHER_MEMBER = "user_other";

const managerA = makeGovConContext({ tenantOrgId: TENANT_A, actorHubUserId: "user_a_manager" });

/** A plain member: holds the self grant, but NOT profile:manage. */
const memberA = makeGovConContext({
  tenantOrgId: TENANT_A,
  actorHubUserId: MEMBER,
  roles: ["govcon_contributor"],
  permissions: new Set([
    GOVCON_PERMISSIONS.GOVCON_VIEW,
    GOVCON_PERMISSIONS.GOVCON_PROFILE_SELF_MANAGE,
  ]),
});

/** Same member id, different tenant — proves scoping is by org, not user. */
const memberB = makeGovConContext({ tenantOrgId: TENANT_B, actorHubUserId: MEMBER });

const PROPOSAL = {
  headline: "Senior Cloud Architect",
  summary: "Builds cloud infrastructure for DoD customers.",
  laborCategory: "Systems Engineer III",
  yearsExperience: "12",
  clearanceLevel: "ts_sci",
  skills: [
    { name: "AWS", category: "Cloud", proficiency: "expert", source: "ai", confirmed: true },
    { name: "Kubernetes", category: "Cloud", proficiency: "proficient", source: "ai", confirmed: true },
  ],
  certifications: [
    { name: "CISSP", issuer: "ISC2", issuedOn: "2018", source: "heuristic", confirmed: true },
  ],
  education: [
    { institution: "Virginia Tech", degree: "M.S.", field: "Computer Science", completedOn: "2014", source: "ai", confirmed: true },
  ],
  experience: [
    {
      organization: "Booz Allen Hamilton",
      role: "Senior Cloud Architect",
      startedOn: "2019-01",
      endedOn: null,
      isFederal: true,
      agency: "U.S. Navy",
      contractName: "NAVSEA Enterprise Cloud",
      source: "ai",
      confirmed: true,
    },
  ],
  resumeSourceFilename: "jane-sample-resume.pdf",
  resumeParseModel: "claude-opus-4-8",
};

async function cleanup() {
  for (const tenant of [TENANT_A, TENANT_B]) {
    await prisma.govConActivityEvent.deleteMany({ where: { hubOrganizationId: tenant } });
    await prisma.govConMemberProfile.deleteMany({ where: { hubOrganizationId: tenant } });
  }
}

describe("member profile service", { skip: !hasDatabase && "no DATABASE_URL" }, () => {
  before(cleanup);
  after(cleanup);

  test("getOrCreateProfile lazily creates an empty draft", async () => {
    const { profile, completeness } = await getOrCreateProfile(memberA);
    assert.equal(profile.hubUserId, MEMBER);
    assert.equal(profile.hubOrganizationId, TENANT_A);
    assert.equal(profile.status, "draft");
    assert.equal(profile.clearanceLevel, "none");
    // An empty draft asserts nothing, so it is safe to create on first view.
    assert.equal(profile.skills.length, 0);
    assert.ok(completeness.score >= 0);
  });

  test("getOrCreateProfile is idempotent — no duplicate row per member", async () => {
    const first = await getOrCreateProfile(memberA);
    const second = await getOrCreateProfile(memberA);
    assert.equal(first.profile.id, second.profile.id);
  });

  test("applyResumeProposal persists confirmed data and recomputes completeness", async () => {
    await getOrCreateProfile(memberA);
    const { profile, completeness } = await applyResumeProposal(memberA, MEMBER, PROPOSAL);

    assert.equal(profile.headline, "Senior Cloud Architect");
    assert.equal(profile.yearsExperience, 12);
    assert.equal(profile.clearanceLevel, "ts_sci");
    assert.equal(profile.skills.length, 2);
    assert.equal(profile.certifications.length, 1);
    assert.equal(profile.experience.length, 1);
    assert.equal(profile.experience[0].isFederal, true);
    assert.equal(profile.experience[0].agency, "U.S. Navy");
    // Partial dates normalise rather than being rejected or invented.
    assert.equal(profile.education[0].completedOn?.getUTCFullYear(), 2014);
    assert.ok(completeness.score > 50, "a rich profile should score well");
    assert.equal(profile.completeness, completeness.score, "denormalised score must match");
  });

  test("applyResumeProposal records parse provenance but never a stored-file pointer", async () => {
    await getOrCreateProfile(memberA);
    const { profile } = await applyResumeProposal(memberA, MEMBER, PROPOSAL);

    assert.equal(profile.resumeSourceFilename, "jane-sample-resume.pdf");
    assert.equal(profile.resumeParseModel, "claude-opus-4-8");
    assert.ok(profile.resumeParsedAt instanceof Date);

    // The whole point: provenance only. No column may hold the resume itself.
    const columns = Object.keys(profile);
    for (const forbidden of ["storageReference", "resumeBlob", "resumeText", "resumeUrl"]) {
      assert.ok(!columns.includes(forbidden), `profile must not persist ${forbidden}`);
    }
  });

  test("applyResumeProposal replaces collections so rejected rows do not survive", async () => {
    await getOrCreateProfile(memberA);
    await applyResumeProposal(memberA, MEMBER, PROPOSAL);

    // Simulate the member unchecking a bad AI skill in the review UI.
    const trimmed = { ...PROPOSAL, skills: [PROPOSAL.skills[0]] };
    const { profile } = await applyResumeProposal(memberA, MEMBER, trimmed);

    assert.equal(profile.skills.length, 1, "the rejected skill must be gone");
    assert.equal(profile.skills[0].name, "AWS");
  });

  test("source provenance survives the round trip", async () => {
    await getOrCreateProfile(memberA);
    const { profile } = await applyResumeProposal(memberA, MEMBER, PROPOSAL);
    assert.equal(profile.certifications[0].source, "heuristic");
    assert.equal(profile.skills.find((s) => s.name === "AWS")?.source, "ai");
  });

  test("applying a resume writes an audit event without the resume contents", async () => {
    await getOrCreateProfile(memberA);
    await applyResumeProposal(memberA, MEMBER, PROPOSAL);

    const events = await prisma.govConActivityEvent.findMany({
      where: { hubOrganizationId: TENANT_A, action: "member_profile.resume_applied" },
    });
    assert.ok(events.length > 0, "resume application must be audited");
    const after = events[0].afterJson as Record<string, unknown>;
    assert.equal(after.parseModel, "claude-opus-4-8");
    assert.equal(after.sourceFilename, "jane-sample-resume.pdf");
    // Counts and provenance are fine; the resume's text is not.
    assert.ok(!("resumeText" in after), "audit must not carry resume contents");
  });

  test("a member cannot read another member's profile without profile:manage", async () => {
    await getOrCreateProfile(managerA, OTHER_MEMBER);
    await assert.rejects(() => findProfile(memberA, OTHER_MEMBER), AuthzError);
  });

  test("a member cannot write another member's profile without profile:manage", async () => {
    await getOrCreateProfile(managerA, OTHER_MEMBER);
    await assert.rejects(() => applyResumeProposal(memberA, OTHER_MEMBER, PROPOSAL), AuthzError);
    await assert.rejects(() => updateProfile(memberA, OTHER_MEMBER, { headline: "x" }), AuthzError);
  });

  test("a manager with profile:manage can read another member's profile", async () => {
    await getOrCreateProfile(managerA, OTHER_MEMBER);
    const found = await findProfile(managerA, OTHER_MEMBER);
    assert.ok(found, "manager should resolve the profile");
    assert.equal(found.profile.hubUserId, OTHER_MEMBER);
  });

  test("profiles are tenant-scoped — same hubUserId, different org, different row", async () => {
    const a = await getOrCreateProfile(memberA);
    const b = await getOrCreateProfile(memberB);
    assert.notEqual(a.profile.id, b.profile.id);

    await applyResumeProposal(memberA, MEMBER, PROPOSAL);
    const bAgain = await findProfile(memberB, MEMBER);
    assert.equal(bAgain?.profile.headline, null, "tenant B must not see tenant A's data");
  });

  test("listPublishedProfiles excludes drafts and requires profile:manage", async () => {
    await getOrCreateProfile(memberA);
    await applyResumeProposal(memberA, MEMBER, PROPOSAL);

    // Still a draft → must not appear in an org-wide rollup.
    let published = await listPublishedProfiles(managerA);
    assert.ok(!published.some((p) => p.profile.hubUserId === MEMBER));

    await publishProfile(memberA, MEMBER);
    published = await listPublishedProfiles(managerA);
    assert.ok(published.some((p) => p.profile.hubUserId === MEMBER));

    // A plain member cannot enumerate the org.
    await assert.rejects(() => listPublishedProfiles(memberA), AuthzError);
  });

  test("publishProfile is audited and flips status", async () => {
    await getOrCreateProfile(memberA);
    const { profile } = await publishProfile(memberA, MEMBER);
    assert.equal(profile.status, "published");

    const events = await prisma.govConActivityEvent.findMany({
      where: { hubOrganizationId: TENANT_A, action: "member_profile.published" },
    });
    assert.ok(events.length > 0);
  });

  test("updateProfile leaves omitted fields untouched", async () => {
    await getOrCreateProfile(memberA);
    await applyResumeProposal(memberA, MEMBER, PROPOSAL);

    const { profile } = await updateProfile(memberA, MEMBER, { headline: "Principal Architect" });
    assert.equal(profile.headline, "Principal Architect");
    // summary was not in the payload, so it must survive.
    assert.equal(profile.summary, "Builds cloud infrastructure for DoD customers.");
  });
});
