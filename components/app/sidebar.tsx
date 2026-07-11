"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { NAV_GROUPS, type NavItem } from "./nav-config";

const COLLAPSE_KEY = "gc:sidebar:collapsed";

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  if (item.matchPrefix) return pathname === item.href || pathname.startsWith(item.href + "/");
  return pathname === item.href;
}

export function Sidebar({
  onNavigate,
  forceExpanded = false,
}: {
  onNavigate?: () => void;
  forceExpanded?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (forceExpanded) return;
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, [forceExpanded]);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const isCollapsed = collapsed && !forceExpanded;

  return (
    <div
      className={cn(
        "gc-sidebar flex h-full flex-col text-[13px]",
        isCollapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </span>
        {!isCollapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">GovCon Ops</div>
            <div className="truncate text-[11px] text-slate-400">MacTech Suite</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {!isCollapsed && (
              <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                        active
                          ? "bg-blue-600/90 font-medium text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white",
                        isCollapsed && "justify-center px-0",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!forceExpanded && (
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 border-t border-white/5 px-4 py-3 text-slate-400 hover:text-white"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span className="text-xs">Collapse</span>}
        </button>
      )}
    </div>
  );
}
