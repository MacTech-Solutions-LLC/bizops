/**
 * AI resume extraction via the Claude API.
 *
 * Scope boundary — the model handles what heuristics cannot: prose that has to
 * be *understood* rather than matched (role summaries, skill grouping, whether
 * an employer was a federal customer). It is deliberately NOT asked for:
 *
 *  - Clearance level. Exact-match only (see heuristics.ts). A model inferring
 *    "probably Secret" from context would put an unverifiable clearance claim
 *    on a federal bid. Not a risk worth any amount of recall.
 *  - Contact details. Identity is Hub-owned; we don't want them, so we don't
 *    ask for them, and they never enter the extraction payload.
 *
 * Privacy: this sends resume text to the Anthropic API. That is a deliberate,
 * user-approved decision — see docs/RESUME_PARSING.md. Resume text is sent, a
 * structured result comes back, and neither is written to disk here.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// zod/v4 (not the bare "zod" the rest of this app uses): the SDK's
// zodOutputFormat helper is typed against zod v4, and passing a v3 schema
// silently infers `{}` for parsed_output instead of failing loudly. zod 3.25
// ships v4 under this subpath, so this is a scoped import, not a second copy.
import { z } from "zod/v4";
import { logger } from "@/lib/logger";
import { OperationalError } from "@/lib/errors";
import { candidateNaics, validateNaics, type NaicsSuggestion } from "@/lib/naics";

/**
 * The NAICS vocabulary, rendered once at module load.
 *
 * It goes in the *system* prompt rather than the user turn on purpose: the
 * render order is tools → system → messages, so a static list here sits in the
 * cached prefix and the resume text (which changes every call) lands after the
 * breakpoint. Inlining it alongside the resume would put a ~6k-token constant
 * behind a varying prefix and cache nothing.
 */
const NAICS_CANDIDATE_LIST = candidateNaics()
  .map((c) => `${c.code} ${c.title}`)
  .join("\n");

/** Pinned deliberately: extraction quality is validated against this model.
 * Bump only alongside a re-check of the review-step output. */
export const RESUME_PARSE_MODEL = "claude-opus-4-8";

/** Resumes are a few pages; this is ample for the structured result and leaves
 * room for adaptive thinking without risking a mid-object truncation. */
const MAX_TOKENS = 16_000;

/** Guards against a pathological upload burning tokens. ~25k chars is well
 * beyond any real resume; past this we're parsing something else. */
const MAX_INPUT_CHARS = 25_000;

const proficiencySchema = z.enum(["familiar", "proficient", "expert"]);

/** A partial date as written on a resume: "2019", "2019-06", or "2019-06-01".
 * Resumes rarely give a full date and forcing one would invite invention. */
const partialDate = z.string().nullable();

const extractionSchema = z.object({
  headline: z
    .string()
    .nullable()
    .describe("Professional title for a capability statement, e.g. 'Senior Cloud Architect'."),
  summary: z
    .string()
    .nullable()
    .describe("2-3 sentence professional summary written in third person, no name."),
  laborCategory: z
    .string()
    .nullable()
    .describe("Best-fit government labor category (LCAT), e.g. 'Systems Engineer III'."),
  skills: z
    .array(
      z.object({
        name: z.string().describe("The skill, e.g. 'Kubernetes'. Not a sentence."),
        category: z
          .string()
          .nullable()
          .describe("Grouping, e.g. 'Cloud', 'Security', 'Programming'."),
        proficiency: proficiencySchema,
        yearsExperience: z.number().int().nullable(),
      }),
    )
    .describe("Distinct professional skills. Omit soft skills like 'team player'."),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().nullable(),
      identifier: z.string().nullable().describe("Certificate/license number if stated."),
      issuedOn: partialDate,
      expiresOn: partialDate,
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string().nullable().describe("e.g. 'B.S.', 'M.S.', 'Ph.D.'"),
      field: z.string().nullable(),
      completedOn: partialDate,
    }),
  ),
  experience: z.array(
    z.object({
      organization: z.string(),
      role: z.string().nullable(),
      startedOn: partialDate,
      endedOn: partialDate.describe("null if this is the person's current role."),
      summary: z.string().nullable().describe("One or two sentences on what they did."),
      isFederal: z
        .boolean()
        .describe("True only if the customer or employer was a US federal agency or a prime/sub on a federal contract."),
      agency: z.string().nullable().describe("Federal customer, if any, e.g. 'U.S. Navy'."),
      contractName: z.string().nullable().describe("Contract or program name, if stated."),
    }),
  ),
  capabilityHighlights: z
    .array(z.string())
    .describe(
      "3-5 achievement bullets suitable for a capability statement. Quantified where the resume supports it.",
    ),
  naics: z
    .array(
      z.object({
        code: z
          .string()
          .describe("A 6-digit NAICS code copied EXACTLY from the candidate list."),
        rationale: z
          .string()
          .describe(
            "One short sentence citing what in the resume supports this code. No name.",
          ),
      }),
    )
    .describe(
      "The 3 NAICS industries this person's experience best supports, most relevant first. Fewer than 3 if the resume doesn't support 3.",
    ),
});

/**
 * What this module returns — deliberately not the raw model output.
 *
 * `naics` is re-typed as `NaicsSuggestion[]`: the wire schema is what the model
 * is asked for, but what leaves here has been through `validateNaics`, so every
 * code is real and every title is the Census one. The type difference is the
 * point — a caller cannot accidentally consume an unvalidated code.
 */
export type ResumeExtraction = Omit<z.infer<typeof extractionSchema>, "naics"> & {
  naics: NaicsSuggestion[];
};

const SYSTEM_PROMPT = `You extract structured data from resumes for MacTech Solutions, a US federal government contractor. The extracted data populates a consultant's internal profile and their Capability Statement for federal bids.

Extraction rules:
- Extract only what the resume states. If a field is not supported by the text, return null (or an empty array). Never infer, embellish, or fill a gap with a plausible guess — an invented credential on a federal bid is a serious problem, and every field you return is shown to the person for confirmation, so an omission is cheap and a fabrication is not.
- Do not extract names, emails, phone numbers, addresses, or any other contact detail. They are handled elsewhere and are not wanted here.
- Do not extract or infer security clearance. That is handled by a separate exact-match process. Ignore clearance statements entirely.
- isFederal is true only when the resume shows the work was for a US federal customer, or as a prime/subcontractor on a federal contract. A commercial employer with no stated federal customer is false.
- Write summary and capabilityHighlights in third person with no name ("Led a team of 6..."), so they drop directly into a capability statement.
- Prefer the resume's own wording for skills and titles over your paraphrase.

NAICS rules:
- Every code you return MUST be copied verbatim from the candidate list below. Do not recall a code from memory, do not adapt one, and do not invent a plausible-looking one — a code that is not on the list is discarded, so guessing costs you the slot and gains nothing.
- Rank by what the person has actually *done*, not by their employer's industry. A cybersecurity engineer at an aircraft manufacturer is Computer Systems Design Services, not Aircraft Manufacturing.
- Return fewer than 3 rather than padding with a weak match. Each one has to be defensible from the resume text, and the member sees your rationale.

<naics_candidates>
${NAICS_CANDIDATE_LIST}
</naics_candidates>`;

function client(): Anthropic {
  // The SDK resolves ANTHROPIC_API_KEY (or an `ant auth login` profile) itself;
  // check explicitly so a missing key is a clear config error at the call site
  // rather than an opaque 401 from the API.
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new OperationalError("ANTHROPIC_API_KEY is not configured", {
      userMessage:
        "Resume parsing is not configured in this environment. You can still fill in your profile manually.",
    });
  }
  return new Anthropic();
}

/**
 * Extract structured profile data from resume text.
 *
 * @throws OperationalError when the API is unreachable, unconfigured, or
 * returns something that does not satisfy the schema. Callers are expected to
 * degrade to the heuristic-only result rather than fail onboarding outright.
 */
export async function extractWithAI(resumeText: string): Promise<ResumeExtraction> {
  const anthropic = client();
  const text = resumeText.slice(0, MAX_INPUT_CHARS);

  let response;
  try {
    response = await anthropic.messages.parse({
      model: RESUME_PARSE_MODEL,
      max_tokens: MAX_TOKENS,
      // Cached: the prompt is a ~6k-token constant dominated by the NAICS
      // table, and every resume parse re-sends it. The breakpoint goes on the
      // last (only) system block, so tools+system cache together and the
      // resume text — the sole varying part — stays after it. Opus needs a
      // 4096-token prefix to cache at all, which the NAICS list clears on its
      // own; if that list is ever trimmed below it, this silently stops
      // caching rather than erroring. Check `cache_read_input_tokens`.
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(extractionSchema) },
      messages: [
        {
          role: "user",
          content: `Extract the structured profile from this resume.\n\n<resume>\n${text}\n</resume>`,
        },
      ],
    });
  } catch (cause) {
    if (cause instanceof Anthropic.RateLimitError) {
      throw new OperationalError("Anthropic rate limit hit during resume parse", {
        userMessage: "Resume parsing is busy right now. Please try again in a moment.",
        cause,
      });
    }
    if (cause instanceof Anthropic.APIConnectionError) {
      throw new OperationalError("Could not reach the Anthropic API", {
        userMessage: "Couldn't reach the parsing service. Please try again shortly.",
        cause,
      });
    }
    // Deliberately does not include the API's message: on a 400 it can echo
    // request content, which here is the resume.
    throw new OperationalError("Anthropic resume extraction failed", { cause });
  }

  if (response.stop_reason === "refusal") {
    throw new OperationalError("Resume extraction refused by safety classifier", {
      userMessage:
        "We couldn't process that document automatically. Please fill in your profile manually.",
      context: { category: response.stop_details?.category ?? null },
    });
  }
  if (response.stop_reason === "max_tokens") {
    throw new OperationalError("Resume extraction truncated at max_tokens", {
      userMessage: "That resume was too long to parse in one pass. Please try a shorter version.",
    });
  }
  if (!response.parsed_output) {
    throw new OperationalError("Anthropic returned no parsable extraction", {
      userMessage: "We couldn't read structured details from that resume. Please fill it in manually.",
    });
  }

  // The model is instructed to copy codes from the candidate list, but an
  // instruction is not a guarantee — `validateNaics` is what makes it one. A
  // code that isn't in the Census table is dropped rather than shown to the
  // member, and the title we keep is the official one, never the model's.
  const naics = validateNaics(response.parsed_output.naics ?? []);
  const naicsProposed = response.parsed_output.naics?.length ?? 0;
  if (naicsProposed > naics.length) {
    // Not an error — the guard did its job. Worth seeing if it climbs, since a
    // rising reject rate means the prompt and the table have drifted apart.
    logger.warn("resume_ai_naics_rejected", {
      model: RESUME_PARSE_MODEL,
      proposed: naicsProposed,
      kept: naics.length,
    });
  }

  logger.info("resume_ai_extraction_ok", {
    model: RESUME_PARSE_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    // Zero on the first parse, then the whole NAICS table on every one after.
    cacheReadTokens: response.usage.cache_read_input_tokens,
    cacheWriteTokens: response.usage.cache_creation_input_tokens,
    skills: response.parsed_output.skills.length,
    experience: response.parsed_output.experience.length,
    naics: naics.length,
  });

  return { ...response.parsed_output, naics };
}
