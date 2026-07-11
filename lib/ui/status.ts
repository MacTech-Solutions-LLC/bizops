/**
 * Status → presentation maps. Each entry carries a human label (the primary,
 * non-color indicator — screen readers and colorblind users read the text) plus
 * Tailwind classes for the pill and a dot. Accents: blue/teal/violet/green/
 * amber/orange/slate/red per the GovCon palette.
 */

export interface StatusStyle {
  label: string;
  pill: string; // full pill classes (bg + text + ring)
  dot: string; // dot bg class
}

const S = {
  slate: {
    pill: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
    dot: "bg-slate-400",
  },
  blue: {
    pill: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    dot: "bg-blue-500",
  },
  teal: {
    pill: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200",
    dot: "bg-teal-500",
  },
  violet: {
    pill: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
    dot: "bg-violet-500",
  },
  green: {
    pill: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
    dot: "bg-green-500",
  },
  amber: {
    pill: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    dot: "bg-amber-500",
  },
  orange: {
    pill: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
    dot: "bg-orange-500",
  },
  red: {
    pill: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
    dot: "bg-red-500",
  },
} as const;

type Color = keyof typeof S;

function make(label: string, color: Color): StatusStyle {
  return { label, pill: S[color].pill, dot: S[color].dot };
}

export const STAGE_STYLES: Record<string, StatusStyle> = {
  IDENTIFIED: make("Identified", "slate"),
  SCREENING: make("Screening", "slate"),
  QUALIFIED: make("Qualified", "blue"),
  CAPTURE: make("Capture", "violet"),
  BID_NO_BID: make("Bid / No-Bid", "amber"),
  PROPOSAL: make("Proposal", "teal"),
  SUBMITTED: make("Submitted", "blue"),
  EVALUATION: make("Evaluation", "violet"),
  AWARDED: make("Awarded", "green"),
  LOST: make("Lost", "red"),
  CANCELED: make("Canceled", "slate"),
  ARCHIVED: make("Archived", "slate"),
};

export const HEALTH_STYLES: Record<string, StatusStyle> = {
  ON_TRACK: make("On track", "green"),
  AT_RISK: make("At risk", "amber"),
  CRITICAL: make("Critical", "red"),
  UNKNOWN: make("Unknown", "slate"),
};

export const PRIORITY_STYLES: Record<string, StatusStyle> = {
  LOW: make("Low", "slate"),
  MEDIUM: make("Medium", "blue"),
  HIGH: make("High", "orange"),
  CRITICAL: make("Critical", "red"),
};

export const TASK_STATUS_STYLES: Record<string, StatusStyle> = {
  BACKLOG: make("Backlog", "slate"),
  TODO: make("To Do", "slate"),
  IN_PROGRESS: make("In Progress", "blue"),
  INTERNAL_REVIEW: make("Internal Review", "violet"),
  REVISION_REQUIRED: make("Revision Required", "amber"),
  APPROVED: make("Approved", "teal"),
  COMPLETE: make("Complete", "green"),
};

export const VOLUME_STATUS_STYLES: Record<string, StatusStyle> = {
  NOT_STARTED: make("Not Started", "slate"),
  IN_PROGRESS: make("In Progress", "blue"),
  INTERNAL_REVIEW: make("Internal Review", "violet"),
  REVISION_REQUIRED: make("Revision Required", "amber"),
  APPROVED: make("Approved", "teal"),
  COMPLETE: make("Complete", "green"),
};

export const REQUIREMENT_STATUS_STYLES: Record<string, StatusStyle> = {
  UNASSIGNED: make("Unassigned", "red"),
  ASSIGNED: make("Assigned", "blue"),
  DRAFTED: make("Drafted", "violet"),
  IN_REVIEW: make("In Review", "amber"),
  COMPLETE: make("Complete", "green"),
};

export const REVIEW_TYPE_STYLES: Record<string, StatusStyle> = {
  BLUE: make("Blue Team", "blue"),
  PINK: make("Pink Team", "violet"),
  RED: make("Red Team", "red"),
  GOLD: make("Gold Team", "amber"),
  WHITE_GLOVE: make("White Glove", "slate"),
};

export const SEVERITY_STYLES: Record<string, StatusStyle> = {
  LOW: make("Low", "slate"),
  MEDIUM: make("Medium", "amber"),
  HIGH: make("High", "orange"),
  CRITICAL: make("Critical", "red"),
};

export const FINDING_STATUS_STYLES: Record<string, StatusStyle> = {
  OPEN: make("Open", "red"),
  IN_PROGRESS: make("In Progress", "amber"),
  RESOLVED: make("Resolved", "teal"),
  CLOSED: make("Closed", "green"),
  WONT_FIX: make("Won't Fix", "slate"),
};

export const READINESS_STYLES: Record<string, StatusStyle> = {
  NOT_STARTED: make("Not Started", "slate"),
  IN_PROGRESS: make("In Progress", "blue"),
  ACTIVE: make("Active", "green"),
  EXPIRING_SOON: make("Expiring Soon", "amber"),
  EXPIRED: make("Expired", "red"),
  NOT_APPLICABLE: make("N/A", "slate"),
};

export const AGREEMENT_STYLES: Record<string, StatusStyle> = {
  NONE: make("None", "slate"),
  REQUESTED: make("Requested", "amber"),
  IN_NEGOTIATION: make("In Negotiation", "orange"),
  EXECUTED: make("Executed", "green"),
  EXPIRED: make("Expired", "red"),
};

export const BID_OUTCOME_STYLES: Record<string, StatusStyle> = {
  PENDING: make("Pending", "slate"),
  BID: make("Bid", "green"),
  CONDITIONAL_BID: make("Conditional Bid", "teal"),
  HOLD: make("Hold", "amber"),
  NO_BID: make("No-Bid", "red"),
};

export const OUTCOME_STYLES: Record<string, StatusStyle> = {
  PENDING: make("Pending", "slate"),
  AWARDED: make("Awarded", "green"),
  LOST: make("Lost", "red"),
  NO_BID: make("No-Bid", "slate"),
  CANCELED: make("Canceled", "slate"),
};

export const TEAM_ROLE_STYLES: Record<string, StatusStyle> = {
  PRIME: make("Prime", "blue"),
  SUBCONTRACTOR: make("Sub", "violet"),
  UNDECIDED: make("Undecided", "slate"),
};

/** Fallback lookup — returns a neutral pill for unknown keys. */
export function styleFor(
  map: Record<string, StatusStyle>,
  key: string | null | undefined,
): StatusStyle {
  if (key && map[key]) return map[key];
  return make(key ? key : "—", "slate");
}
