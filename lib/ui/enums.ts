/**
 * Client-safe enum option lists (value + label). Defined as plain data so
 * forms/filters never import the Prisma client into the browser bundle. Values
 * mirror the Prisma enums exactly.
 */

export interface Option {
  value: string;
  label: string;
}

export const OPPORTUNITY_TYPES: Option[] = [
  { value: "PRIME_CONTRACT", label: "Prime Contract" },
  { value: "SUBCONTRACT", label: "Subcontract" },
  { value: "RFP", label: "RFP" },
  { value: "RFQ", label: "RFQ" },
  { value: "RFI", label: "RFI" },
  { value: "SOURCES_SOUGHT", label: "Sources Sought" },
  { value: "PRESOLICITATION", label: "Presolicitation" },
  { value: "IDIQ_TASK_ORDER", label: "IDIQ Task Order" },
  { value: "GSA", label: "GSA" },
  { value: "SBIR", label: "SBIR" },
  { value: "STTR", label: "STTR" },
  { value: "BAA", label: "BAA" },
  { value: "OTA", label: "OTA" },
  { value: "GRANT", label: "Grant" },
  { value: "TEAMING", label: "Teaming" },
  { value: "OTHER", label: "Other" },
];

export const STAGES: Option[] = [
  { value: "IDENTIFIED", label: "Identified" },
  { value: "SCREENING", label: "Screening" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CAPTURE", label: "Capture" },
  { value: "BID_NO_BID", label: "Bid / No-Bid" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "EVALUATION", label: "Evaluation" },
  { value: "AWARDED", label: "Awarded" },
  { value: "LOST", label: "Lost" },
  { value: "CANCELED", label: "Canceled" },
  { value: "ARCHIVED", label: "Archived" },
];

export const HEALTHS: Option[] = [
  { value: "ON_TRACK", label: "On track" },
  { value: "AT_RISK", label: "At risk" },
  { value: "CRITICAL", label: "Critical" },
  { value: "UNKNOWN", label: "Unknown" },
];

export const PRIORITIES: Option[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const TEAM_ROLES: Option[] = [
  { value: "PRIME", label: "Prime" },
  { value: "SUBCONTRACTOR", label: "Subcontractor" },
  { value: "UNDECIDED", label: "Undecided" },
];

export const COMPETITION_TYPES: Option[] = [
  { value: "FULL_AND_OPEN", label: "Full & Open" },
  { value: "SMALL_BUSINESS_SET_ASIDE", label: "Small Business Set-Aside" },
  { value: "EIGHT_A", label: "8(a)" },
  { value: "SDVOSB_SET_ASIDE", label: "SDVOSB Set-Aside" },
  { value: "WOSB_SET_ASIDE", label: "WOSB Set-Aside" },
  { value: "HUBZONE_SET_ASIDE", label: "HUBZone Set-Aside" },
  { value: "SOLE_SOURCE", label: "Sole Source" },
  { value: "IDIQ_TASK_ORDER", label: "IDIQ Task Order" },
  { value: "UNKNOWN", label: "Unknown" },
];

export const MILESTONE_TYPES: Option[] = [
  { value: "BID_NO_BID_REVIEW", label: "Bid/No-Bid Review" },
  { value: "CAPTURE_REVIEW", label: "Capture Review" },
  { value: "NDA_DUE", label: "NDA Due" },
  { value: "TEAMING_AGREEMENT_DUE", label: "Teaming Agreement Due" },
  { value: "QUESTIONS_DUE", label: "Questions Due" },
  { value: "INDUSTRY_DAY", label: "Industry Day" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "PINK_TEAM", label: "Pink Team" },
  { value: "RED_TEAM", label: "Red Team" },
  { value: "GOLD_TEAM", label: "Gold Team" },
  { value: "PRICING_REVIEW", label: "Pricing Review" },
  { value: "DRAFT_DUE", label: "Draft Due" },
  { value: "FINAL_PRODUCTION", label: "Final Production" },
  { value: "SUBMISSION", label: "Submission" },
  { value: "ORAL_PRESENTATION", label: "Oral Presentation" },
  { value: "EXPECTED_AWARD", label: "Expected Award" },
  { value: "DEBRIEF", label: "Debrief" },
  { value: "SBIR_ABSTRACT", label: "SBIR Abstract" },
  { value: "SBIR_FULL_PROPOSAL", label: "SBIR Full Proposal" },
  { value: "OTHER", label: "Other" },
];

export const TASK_STATUSES: Option[] = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "INTERNAL_REVIEW", label: "Internal Review" },
  { value: "REVISION_REQUIRED", label: "Revision Required" },
  { value: "APPROVED", label: "Approved" },
  { value: "COMPLETE", label: "Complete" },
];
