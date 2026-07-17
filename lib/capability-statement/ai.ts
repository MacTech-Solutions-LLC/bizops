/**
 * AI capability-statement drafting via the Claude API.
 *
 * Scope boundary — the model *phrases*, it does not *assert*. It is handed a set
 * of facts the member already confirmed (skills, certifications, NAICS titles,
 * federal past performance, and the member's own summary — from the suite's
 * canonical copy when available) and asked to organise them into capability-
 * statement prose. It is explicitly forbidden from introducing any capability,
 * customer, credential, or metric that is not in the input. On a federal
 * marketing document an invented differentiator is the same class of problem as
 * an invented clearance — see `lib/resume/ai.ts` and the never-guess rule.
 *
 * Every field returned here is shown to the member for edit and confirmation
 * before anything is stored; nothing the model writes is persisted unreviewed.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// zod/v4, matching lib/resume/ai.ts — the SDK's zodOutputFormat helper is typed
// against v4, and a v3 schema silently parses to `{}`.
import { z } from "zod/v4";
import { logger } from "@/lib/logger";
import { OperationalError } from "@/lib/errors";
import type { CapabilityDraft, DraftInput } from "./assemble";

/** Pinned, like the resume model: draft quality is validated against this one.
 * Bump only alongside a re-check of the review-step output. */
export const CAPABILITY_STATEMENT_MODEL = "claude-opus-4-8";

/** Ample for the structured narrative; leaves room for adaptive thinking. */
const MAX_TOKENS = 8_000;

const draftSchema = z.object({
  professionalSummary: z
    .string()
    .nullable()
    .describe(
      "A 2-3 sentence capability-statement summary in third person, no name. Grounded only in the provided summary, role, and past performance.",
    ),
  coreCompetencies: z
    .array(z.string())
    .describe(
      "4-8 concise capability areas, phrased as a customer would search for them, grouped from the provided skills. Each must trace to a provided skill or past-performance item. Not sentences.",
    ),
  differentiators: z
    .array(z.string())
    .describe(
      "2-5 short phrases on what sets this person apart — certifications held, clearance, federal customers served. Only from the provided facts; do not invent awards or metrics.",
    ),
  pastPerformanceHighlights: z
    .array(z.string())
    .describe(
      "One line per provided federal engagement, phrased for a capability statement: what was done and for whom. Only engagements present in the input; never add a customer that was not provided.",
    ),
});

const SYSTEM_PROMPT = `You draft the narrative of a consultant's Capability Statement for MacTech Solutions, a US federal government contractor. The draft is shown to the person to edit and confirm before it is saved and before it is ever put in front of a federal customer.

You are given facts the person has already confirmed. Your job is to PHRASE them as a capability statement — not to add to them.

Absolute rules:
- Use only what is in the input. Never introduce a capability, skill, customer, agency, contract, certification, clearance, award, or metric that is not provided. An invented item on a federal marketing document is a serious problem, and because every line you write is reviewed, an omission costs nothing while a fabrication costs trust.
- Do not quantify what the input does not quantify. If no numbers are given, do not write "reduced costs by 30%".
- Write in third person with no name ("Holds an active Secret clearance...", "Led..."). The text drops directly onto a one-page statement.
- Prefer the person's own wording for skills and titles over paraphrase.
- coreCompetencies and differentiators are short phrases, not sentences. pastPerformanceHighlights are one crisp line each.
- If a section has no supporting facts in the input, return an empty array rather than padding it.`;

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new OperationalError("ANTHROPIC_API_KEY is not configured", {
      userMessage:
        "Automatic drafting is not configured in this environment. You can still write your capability statement by hand.",
    });
  }
  return new Anthropic();
}

/** Render the confirmed facts into the user turn. Compact and label-led so the
 * model can trace every output back to a line here. */
function renderInput(input: DraftInput): string {
  const lines: string[] = [];
  if (input.headline) lines.push(`Professional title: ${input.headline}`);
  if (input.laborCategory) lines.push(`Labor category: ${input.laborCategory}`);
  if (input.yearsExperience != null) lines.push(`Years of experience: ${input.yearsExperience}`);
  if (input.companyName) lines.push(`Company: ${input.companyName}`);
  lines.push(`Clearance: ${input.clearanceLabel}`);
  if (input.summary) lines.push(`\nExisting summary:\n${input.summary}`);
  if (input.skills.length) lines.push(`\nSkills:\n- ${input.skills.join("\n- ")}`);
  if (input.certifications.length)
    lines.push(`\nCertifications:\n- ${input.certifications.join("\n- ")}`);
  if (input.naicsTitles.length)
    lines.push(`\nNAICS industries supported:\n- ${input.naicsTitles.join("\n- ")}`);
  if (input.federalPastPerformance.length) {
    lines.push("\nFederal past performance:");
    for (const p of input.federalPastPerformance) {
      const head = [p.label, p.agency, p.contractName].filter(Boolean).join(" · ");
      lines.push(`- ${head}${p.summary ? `: ${p.summary}` : ""}`);
    }
  }
  return lines.join("\n");
}

/**
 * Draft the narrative sections of a capability statement.
 *
 * @throws OperationalError when the API is unreachable, unconfigured, or returns
 * something off-schema. Callers degrade to the deterministic `seedDraft` rather
 * than failing the member outright.
 */
export async function draftWithAI(input: DraftInput): Promise<CapabilityDraft> {
  const anthropic = client();

  let response;
  try {
    response = await anthropic.messages.parse({
      model: CAPABILITY_STATEMENT_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(draftSchema) },
      messages: [
        {
          role: "user",
          content: `Draft the capability statement narrative from these confirmed facts.\n\n<facts>\n${renderInput(
            input,
          )}\n</facts>`,
        },
      ],
    });
  } catch (cause) {
    if (cause instanceof Anthropic.RateLimitError) {
      throw new OperationalError("Anthropic rate limit hit during statement draft", {
        userMessage: "Drafting is busy right now. Please try again in a moment.",
        cause,
      });
    }
    if (cause instanceof Anthropic.APIConnectionError) {
      throw new OperationalError("Could not reach the Anthropic API", {
        userMessage: "Couldn't reach the drafting service. Please try again shortly.",
        cause,
      });
    }
    // Does not include the API message: on a 400 it can echo the input, which
    // here is the member's profile content.
    throw new OperationalError("Anthropic capability-statement draft failed", { cause });
  }

  if (response.stop_reason === "refusal") {
    throw new OperationalError("Statement draft refused by safety classifier", {
      userMessage:
        "We couldn't draft that automatically. You can still write your capability statement by hand.",
      context: { category: response.stop_details?.category ?? null },
    });
  }
  if (response.stop_reason === "max_tokens") {
    throw new OperationalError("Statement draft truncated at max_tokens", {
      userMessage: "That profile was too large to draft in one pass. Please try again.",
    });
  }
  if (!response.parsed_output) {
    throw new OperationalError("Anthropic returned no parsable draft", {
      userMessage: "We couldn't draft a statement this time. You can write it by hand.",
    });
  }

  logger.info("capability_statement_ai_ok", {
    model: CAPABILITY_STATEMENT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens,
    competencies: response.parsed_output.coreCompetencies.length,
    differentiators: response.parsed_output.differentiators.length,
    pastPerformance: response.parsed_output.pastPerformanceHighlights.length,
    fromSuite: input.fromSuite,
  });

  return response.parsed_output;
}
