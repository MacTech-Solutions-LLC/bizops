import "./_env";
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { extractWithAI, RESUME_PARSE_MODEL } from "@/lib/resume/ai";
import { parseResume } from "@/lib/resume";

/**
 * LIVE API TEST — opt-in, and deliberately not part of the default suite.
 *
 * This calls the real Anthropic API and costs real tokens, so it is gated on an
 * explicit flag rather than merely on the key being present. `npm test` and CI
 * skip it; run it when you change the prompt, the extraction schema, or the
 * pinned model:
 *
 *     railway run npm run test:ai-live
 *
 * `railway run` injects ANTHROPIC_API_KEY from the Railway environment into the
 * subprocess, so the key never has to be copied into a local file.
 *
 * Assertions are about *shape and discipline*, not exact wording — a model is
 * not deterministic and a test that pins its phrasing would be noise. What must
 * hold is: it extracts the real facts, it does not invent, and it obeys the two
 * hard exclusions (no contact details, no clearance).
 */

const LIVE = process.env.RESUME_AI_LIVE === "1" && Boolean(process.env.ANTHROPIC_API_KEY);

const RESUME = `JANE Q. SAMPLE
Fairfax, VA | jane.sample@example.com | (703) 555-0142

PROFESSIONAL SUMMARY
Systems engineer with 12+ years of experience delivering cloud infrastructure
for Department of Defense customers. Active TS/SCI clearance with CI polygraph.

EXPERIENCE

Senior Cloud Architect
Booz Allen Hamilton, McLean VA | 2019 - Present
Led migration of 40+ legacy applications to AWS GovCloud for the U.S. Navy
under the NAVSEA Enterprise Cloud contract. Reduced hosting costs by 38%.
Managed a team of 6 engineers across two sites.

Systems Engineer II
Leidos, Reston VA | 2014 - 2019
Supported DISA network modernization. Designed a Kubernetes-based container
platform serving 12,000 users.

Software Engineer
Acme Commercial Systems, Austin TX | 2012 - 2014
Built internal billing tools in Python and PostgreSQL.

EDUCATION
M.S. Computer Science, Virginia Tech, 2014
B.S. Electrical Engineering, University of Texas at Austin, 2012

CERTIFICATIONS
CISSP (ISC2), #123456, issued 2018
AWS Certified Solutions Architect - Professional, 2020
PMP, Project Management Institute, 2019

TECHNICAL SKILLS
AWS, Azure, Kubernetes, Docker, Terraform, Python, Go, PostgreSQL
`;

describe(
  "resume AI extraction (live)",
  { skip: !LIVE && "set RESUME_AI_LIVE=1 and provide ANTHROPIC_API_KEY (try: railway run npm run test:ai-live)" },
  () => {
    test(`${RESUME_PARSE_MODEL} extracts a resume into the expected shape`, async () => {
      const result = await extractWithAI(RESUME);

      // --- it found the real content ---
      assert.ok(result.headline, "should produce a headline");
      assert.ok(result.summary, "should produce a summary");
      assert.ok(result.skills.length >= 4, `expected several skills, got ${result.skills.length}`);
      assert.equal(result.experience.length, 3, "should find all three roles");
      assert.equal(result.education.length, 2, "should find both degrees");
      assert.ok(result.capabilityHighlights.length >= 1, "should draft highlights");

      const skillNames = result.skills.map((s) => s.name.toLowerCase());
      assert.ok(skillNames.some((s) => s.includes("kubernetes")), "should find Kubernetes");
      assert.ok(skillNames.some((s) => s.includes("aws")), "should find AWS");

      // --- federal vs commercial is correctly distinguished ---
      const booz = result.experience.find((e) => /booz/i.test(e.organization));
      const acme = result.experience.find((e) => /acme/i.test(e.organization));
      assert.ok(booz, "should find the Booz Allen role");
      assert.equal(booz.isFederal, true, "Navy/NAVSEA work must be flagged federal");
      assert.ok(acme, "should find the Acme role");
      assert.equal(acme.isFederal, false, "commercial employer with no federal customer must be false");

      // --- HARD EXCLUSION: no clearance, ever (heuristics own this) ---
      const serialised = JSON.stringify(result).toLowerCase();
      for (const term of ["ts/sci", "tssci", "polygraph", "clearance"]) {
        assert.ok(!serialised.includes(term), `model must not extract clearance data (found "${term}")`);
      }

      // --- HARD EXCLUSION: no contact details (identity is Hub-owned) ---
      for (const pii of ["jane.sample@example.com", "703", "555-0142"]) {
        assert.ok(!serialised.includes(pii.toLowerCase()), `model must not extract contact details (found "${pii}")`);
      }
      assert.ok(!/\bjane\b/.test(serialised), "model must not extract the person's name");

      console.log("    → headline:", result.headline);
      console.log("    → lcat    :", result.laborCategory);
      console.log("    → skills  :", result.skills.length, "| federal roles:", result.experience.filter((e) => e.isFederal).length);
    });

    test("full pipeline reports aiStatus ok and still stores nothing", async () => {
      const bytes = new TextEncoder().encode(RESUME);
      const proposal = await parseResume(bytes, "text/plain", "jane-sample.txt");

      assert.equal(proposal.meta.aiStatus, "ok", proposal.meta.aiMessage ?? "AI pass should succeed");
      assert.equal(proposal.meta.model, RESUME_PARSE_MODEL);
      assert.equal(proposal.meta.resumeStored, false);

      // Clearance comes from the heuristic pass even though AI ran — the two
      // layers must compose, not compete.
      assert.equal(proposal.clearance.level, "ts_sci");
      assert.match(proposal.clearance.evidence ?? "", /TS\/SCI/);

      // Heuristic certs keep their canonical names and provenance after merge.
      const cissp = proposal.certifications.find((c) => c.name === "CISSP");
      assert.ok(cissp, "CISSP should survive the heuristic/AI merge");
      assert.equal(cissp.source, "heuristic");
      // ...and pick up detail only the AI pass can see.
      assert.ok(cissp.issuer, "merge should enrich the heuristic row with the AI's issuer");

      console.log("    → merged certs:", proposal.certifications.map((c) => `${c.name}(${c.source})`).join(", "));
    });
  },
);
