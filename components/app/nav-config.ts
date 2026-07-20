import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookUser,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Gauge,
  Handshake,
  LayoutDashboard,
  ListChecks,
  Rocket,
  ScrollText,
  Settings,
  Target,
  UserCircle,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match child routes too (e.g. /opportunities/[id]). */
  matchPrefix?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Pipeline",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Opportunities", href: "/opportunities", icon: Target, matchPrefix: true },
      { label: "Active Bids", href: "/active-bids", icon: Gauge },
      { label: "SBIR / STTR", href: "/sbir", icon: Rocket, matchPrefix: true },
      { label: "Capture Plans", href: "/capture", icon: ClipboardCheck, matchPrefix: true },
      { label: "Proposal Room", href: "/proposals", icon: FolderKanban, matchPrefix: true },
    ],
  },
  {
    label: "Execution",
    items: [
      { label: "Tasks", href: "/tasks", icon: ListChecks },
      { label: "Team", href: "/team", icon: Users },
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Activity", href: "/activity", icon: Activity },
    ],
  },
  {
    label: "Relationships",
    items: [
      { label: "Teaming Partners", href: "/partners", icon: Handshake, matchPrefix: true },
      { label: "Contract Vehicles", href: "/vehicles", icon: ScrollText, matchPrefix: true },
      { label: "Agencies & Contacts", href: "/contacts", icon: Building2, matchPrefix: true },
      { label: "Directory", href: "/directory", icon: BookUser, matchPrefix: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Readiness", href: "/readiness", icon: ClipboardCheck },
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "My Profile", href: "/onboarding", icon: UserCircle },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Icons re-exported for command palette / search result typing. */
export const SEARCH_ICONS = { Target, Rocket, Handshake, Building2, Users, ListChecks, FileText };
