/**
 * AI drafting of the org-wide capability statement via the Claude API.
 *
 * Same scope boundary as `lib/capability-statement/ai.ts` — the model *phrases*,
 * it does not *assert*. It is handed content every member already confirmed
 * (their published profiles and their own confirmed capability statements) plus
 * deterministic aggregates (clearance mix, certification counts), and asked to
 * synthesise the strongest company-wide narrative. It is forbidden from
 * introducing any capability, customer, credential, or metric not in the input.
 *
 * Every field returned here goes to a manager for edit and confirmation before
 * anything is stored; nothing the model writes is persisted unreviewed.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// zod/v4, matching the other AI modules — the SDK helper is typed against v4.
import { z } from "zod/v4";
import { logger } from "@/lib/logger";
import { OperationalError } from "@/lib/errors";
import type { CapabilityDraft } from "@/lib/capability-statement/assemble";
import type { CompanyDraftInput } from "./assemble";

/** Pinned like the sibling models; bump only alongside a re-check of output. */
export const COMPANY_STATEMENT_MODEL = "claude-opus-4-8";

const MAX_TOKENS = 8_000;

const draftSchema = z.object({
  professionalSummary: z
    .string()
    .nullable()
    .describe(
      "A 2-4 sentence company capability summary in third person ('MacTech Solutions delivers...'). Grounded only in the provided team content and aggregates.",
    ),
  coreCompetencies: z
    .array(z.string())
    .describe(
      "5-10 concise company capability areas, phrased as a customer would search for them, synthesised from the members' confirmed competencies and skills. Each must trace to provided content. Not sentences.",
    ),
  differentiators: z
    .array(z.string())
    .describe(
      "3-6 short phrases on what sets this company apart — team certifications, clearance depth, federal customers served. Only from the provided facts; do not invent awards, set-asides, or metrics.",
    ),
  pastPerformanceHighlights: z
    .array(z.string())
    .describe(
      "One line per distinct federal engagement in the input, phrased for a company statement: what the team did and for whom. Never add a customer or contract that was not provided.",
    ),
});

const SYSTEM_PROMPT = `You draft the narrative of the company-wide Capability Statement for MacTech Solutions, a US federal government contractor. The draft is shown to a manager to edit and confirm before it is saved and before it is ever put in front of a federal customer.

You are given content the team has already confirmed: each member's published capability profile, their own confirmed capability statements, and deterministic aggregates (certification counts, clearance mix, NAICS coverage). Your job is to SYNTHESISE the best of it into one company statement — not to add to it.

Absolute rules:
- Use only what is in the input. Never introduce a capability, skill, customer, agency, contract, certification, clearance, award, set-aside status, or metric that is not provided. An invented item on a federal marketing document is a serious problem; an omission costs nothing while a fabrication costs trust.
- Do not quantify what the input does not quantify. The member counts and aggregates provided are the only numbers you may use.
- Write about the company and the team, never about a named individual ("The team holds...", "MacTech delivers...").
- De-duplicate: members overlap heavily, and the statement should read as one company's capabilities, not a concatenation of resumes.
- Prefer the members' own confirmed wording for capabilities over paraphrase.
- coreCompetencies and differentiators are short phrases, not sentences. pastPerformanceHighlights are one crisp line each.
- If a section has no supporting content in the input, return an empty array rather than padding it.`;

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new OperationalError("ANTHROPIC_API_KEY is not configured", {
      userMessage:
        "Automatic drafting is not configured in this environment. You can still write the company statement by hand.",
    });
  }
  return new Anthropic();
}

/** Render the confirmed content into the user turn — label-led so the model
 * can trace every output back to a line here. */
function renderInput(input: CompanyDraftInput): string {
  const lines: string[] = [];
  if (input.companyName) lines.push(`Company: ${input.companyName}`);
  if (input.dba) lines.push(`DBA: ${input.dba}`);
  lines.push(`Published team members: ${input.teamSize}`);
  if (input.laborCategories.length)
    lines.push(`Labor categories: ${input.laborCategories.join("; ")}`);
  if (input.clearanceMix.length) lines.push(`Clearance mix: ${input.clearanceMix.join(", ")}`);
  if (input.naicsTitles.length)
    lines.push(`\nNAICS industries supported:\n- ${input.naicsTitles.join("\n- ")}`);
  if (input.certifications.length)
    lines.push(`\nTeam certifications:\n- ${input.certifications.join("\n- ")}`);

  if (input.federalPastPerformance.length) {
    lines.push("\nFederal past performance (de-duplicated across the team):");
    for (const p of input.federalPastPerformance) {
      const head = [p.organization, p.agency, p.contractName].filter(Boolean).join(" · ");
      lines.push(`- ${head}${p.summary ? `: ${p.summary}` : ""}`);
    }
  }

  input.members.forEach((m, i) => {
    lines.push(`\nTeam member ${i + 1}:`);
    if (m.headline) lines.push(`  Title: ${m.headline}`);
    if (m.laborCategory) lines.push(`  Labor category: ${m.laborCategory}`);
    if (m.yearsExperience != null) lines.push(`  Years of experience: ${m.yearsExperience}`);
    if (m.skills.length) lines.push(`  Skills: ${m.skills.join(", ")}`);
    if (m.coreCompetencies.length)
      lines.push(`  Confirmed competencies: ${m.coreCompetencies.join("; ")}`);
    if (m.differentiators.length)
      lines.push(`  Confirmed differentiators: ${m.differentiators.join("; ")}`);
    for (const h of m.pastPerformanceHighlights) {
      lines.push(`  Confirmed past-performance highlight: ${h}`);
    }
  });

  return lines.join("\n");
}

/**
 * Draft the org-wide statement narrative.
 *
 * @throws OperationalError when the API is unreachable, unconfigured, or returns
 * something off-schema. Callers degrade to `seedCompanyDraft` rather than
 * failing the manager outright.
 */
export async function draftCompanyStatementWithAI(
  input: CompanyDraftInput,
): Promise<CapabilityDraft> {
  const anthropic = client();

  let response;
  try {
    response = await anthropic.messages.parse({
      model: COMPANY_STATEMENT_MODEL,
      max_tokens: MAX_TOKENS,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(draftSchema) },
      messages: [
        {
          role: "user",
          content: `Draft the company-wide capability statement narrative from this confirmed team content.\n\n<team_content>\n${renderInput(
            input,
          )}\n</team_content>`,
        },
      ],
    });
  } catch (cause) {
    if (cause instanceof Anthropic.RateLimitError) {
      throw new OperationalError("Anthropic rate limit hit during company statement draft", {
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
    // here is the team's profile content.
    throw new OperationalError("Anthropic company-statement draft failed", { cause });
  }

  if (response.stop_reason === "refusal") {
    throw new OperationalError("Company statement draft refused by safety classifier", {
      userMessage:
        "We couldn't draft that automatically. You can still write the company statement by hand.",
      context: { category: response.stop_details?.category ?? null },
    });
  }
  if (response.stop_reason === "max_tokens") {
    throw new OperationalError("Company statement draft truncated at max_tokens", {
      userMessage: "The team content was too large to draft in one pass. Please try again.",
    });
  }
  if (!response.parsed_output) {
    throw new OperationalError("Anthropic returned no parsable company draft", {
      userMessage: "We couldn't draft the statement this time. You can write it by hand.",
    });
  }

  logger.info("company_statement_ai_ok", {
    model: COMPANY_STATEMENT_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens,
    members: input.members.length,
    competencies: response.parsed_output.coreCompetencies.length,
    differentiators: response.parsed_output.differentiators.length,
    pastPerformance: response.parsed_output.pastPerformanceHighlights.length,
  });

  return response.parsed_output;
}
