"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";

/**
 * App-shell sidebar. Designed for in-product surfaces; equally usable
 * as a docs sidebar or admin navigation.
 *
 * Anatomy
 * =======
 *   ┌───────────────────────────────┐
 *   │ brand                  toggle │
 *   ├───────────────────────────────┤
 *   │ [optional header slot]        │
 *   ├───────────────────────────────┤
 *   │ Section A — eyebrow           │
 *   │   • item 1                    │
 *   │   • item 2 (active)           │
 *   │     ▸ nested item             │
 *   │ Section B — eyebrow           │
 *   │   • item 3                    │
 *   ├───────────────────────────────┤
 *   │ [footer slot — user / help]   │
 *   └───────────────────────────────┘
 *
 * Collapsible rail
 * ----------------
 * Toggle button (PanelLeftClose / PanelLeftOpen) collapses the
 * sidebar to a 64px rail showing icons only. Each item's label is
 * shown as a tooltip on hover. The collapsed state persists to
 * `localStorage[storageKey]` (default "mt-sidebar-collapsed").
 *
 * Mobile drawer
 * -------------
 * Below `breakpoint` (default 768px), the sidebar is hidden by
 * default and rendered as a drawer over a backdrop when triggered
 * via the parent. Pass `mobileOpen` + `onMobileClose` (controlled)
 * or omit them and use the imperative API.
 *
 * Active item
 * -----------
 * Pass `activeHref`. The matching item gets:
 *   - Accent left-border (hairline → 2px accent)
 *   - Soft-accent background tint
 *   - aria-current="page"
 *   - Auto-expansion of its parent section (uncontrolled)
 *
 * Nested items
 * ------------
 * Items with `children` render an inline accordion. Expansion state
 * is per-item, uncontrolled by default; pass `defaultExpanded` to
 * pre-open specific items.
 *
 * Aria + keyboard
 * ---------------
 *   - <nav aria-label="App sidebar">
 *   - Arrow Up/Down: move focus between items in flat order
 *   - Right/Left: expand/collapse nested items
 *   - Home/End: jump to first/last item
 *   - Escape on mobile: close drawer
 *   - Tooltip on collapsed items uses aria-describedby
 */

export interface SidebarItem {
  /** Display label. */
  label: string;
  /** Optional href. When set, the item renders as a link. */
  href?: string;
  /** Optional click handler (alternative to href). */
  onClick?: () => void;
  /** Icon shown in both expanded + collapsed states. */
  icon?: ReactNode;
  /** Optional trailing badge (count, "new", etc). */
  badge?: ReactNode;
  /** Nested children rendered as an accordion. */
  children?: SidebarItem[];
  /** When true, this nested parent starts expanded. */
  defaultExpanded?: boolean;
  /** Disable the item entirely. */
  disabled?: boolean;
}

export interface SidebarSection {
  /** Mono-caps eyebrow label, e.g. "Compliance". */
  heading?: string;
  /** Items within this section. */
  items: SidebarItem[];
}

export interface SidebarNavProps {
  /** Brand mark slot — logo + name typically. */
  brand: ReactNode;
  /** Sections of items. */
  sections: SidebarSection[];
  /** Optional content rendered between brand + sections. */
  header?: ReactNode;
  /** Optional footer (user menu, help, sign-out). */
  footer?: ReactNode;
  /** Currently active href. */
  activeHref?: string;
  /** Width in px when fully expanded. Default 260. */
  width?: number;
  /** Width in px when collapsed to rail. Default 64. */
  railWidth?: number;
  /** Default collapsed state. Default false. */
  defaultCollapsed?: boolean;
  /** Persistence key. Set to null to disable persistence. */
  storageKey?: string | null;
  /** Mobile breakpoint. Default 768px. */
  breakpoint?: number;
  /** Controlled mobile drawer state. */
  mobileOpen?: boolean;
  /** Called when the drawer should close (mobile). */
  onMobileClose?: () => void;
  className?: string;
  style?: CSSProperties;
}

const STORAGE_DEFAULT = "mt-sidebar-collapsed";

export function SidebarNav({
  brand,
  sections,
  header,
  footer,
  activeHref,
  width = 260,
  railWidth = 64,
  defaultCollapsed = false,
  storageKey = STORAGE_DEFAULT,
  breakpoint = 768,
  mobileOpen,
  onMobileClose,
  className = "",
  style,
}: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const containerRef = useRef<HTMLElement | null>(null);
  const navId = useId();

  // Hydrate collapsed from localStorage
  useEffect(() => {
    if (storageKey === null) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "1") setCollapsed(true);
      else if (stored === "0") setCollapsed(false);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      if (storageKey !== null) {
        try {
          localStorage.setItem(storageKey, next ? "1" : "0");
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, [storageKey]);

  // Escape closes mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onMobileClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  const renderWidth = collapsed ? railWidth : width;

  return (
    <>
      {/* Backdrop (mobile only) */}
      {mobileOpen ? (
        <div
          aria-hidden
          onClick={onMobileClose}
          className="mt-sidebar-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgb(0 0 0 / 0.40)",
            zIndex: 40,
          }}
        />
      ) : null}

      <aside
        ref={containerRef}
        className={`mt-sidebar ${className}`}
        aria-label="App sidebar"
        style={{
          width: renderWidth,
          minWidth: renderWidth,
          maxWidth: renderWidth,
          height: "100vh",
          background: "var(--mt-bg)",
          borderRight: "1px solid var(--mt-hairline)",
          display: "flex",
          flexDirection: "column",
          transition: "width 240ms var(--mt-ease-out), transform 240ms var(--mt-ease-out)",
          position: "relative",
          ...style,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? "16px 0" : "16px 16px",
            borderBottom: "1px solid var(--mt-hairline)",
            minHeight: 56,
          }}
        >
          {!collapsed ? (
            <Link
            <a
              href="/"
              className="mt-sidebar-brand font-mt-sans"
              style={{
                color: "var(--mt-text)",
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: "-0.01em",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              {brand}
            </Link>
            </a>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--mt-radius-2)",
              border: "1px solid transparent",
              background: "transparent",
              color: "var(--mt-text-3)",
              cursor: "pointer",
              transition: "background 160ms var(--mt-ease-out), color 160ms var(--mt-ease-out)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--mt-surface-1)";
              e.currentTarget.style.color = "var(--mt-text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--mt-text-3)";
            }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </header>

        {header && !collapsed ? (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mt-hairline)" }}>
            {header}
          </div>
        ) : null}

        <nav
          aria-label="Sidebar navigation"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          <Items
            sections={sections}
            activeHref={activeHref}
            collapsed={collapsed}
            navId={navId}
            onItemClick={() => onMobileClose?.()}
          />
        </nav>

        {footer ? (
          <div
            style={{
              borderTop: "1px solid var(--mt-hairline)",
              padding: collapsed ? "12px 8px" : "12px 16px",
            }}
          >
            {collapsed ? null : footer}
          </div>
        ) : null}
      </aside>

      <style>{`
        @media (max-width: ${breakpoint - 1}px) {
          .mt-sidebar {
            position: fixed !important;
            left: 0;
            top: 0;
            z-index: 50;
            transform: translateX(${mobileOpen ? "0" : "-100%"});
          }
          .mt-sidebar-backdrop { display: block; }
        }
        @media (min-width: ${breakpoint}px) {
          .mt-sidebar-backdrop { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mt-sidebar, .mt-sidebar * { transition: none !important; }
        }
        [data-mt-mood="editorial"] .mt-sidebar-brand {
          font-family: var(--mt-font-serif) !important;
          font-weight: 500;
          letter-spacing: -0.02em;
        }
        [data-mt-mood="industrial"] .mt-sidebar-brand {
          font-family: var(--mt-font-mono) !important;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
      `}</style>
    </>
  );
}

function Items({
  sections,
  activeHref,
  collapsed,
  navId,
  onItemClick,
}: {
  sections: SidebarSection[];
  activeHref?: string;
  collapsed: boolean;
  navId: string;
  onItemClick: () => void;
}) {
  // Keyboard navigation: collect all enabled item refs for arrow nav
  const itemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([]);
  let flatIndex = 0;

  function focusItem(idx: number) {
    const el = itemRefs.current[idx];
    if (el) el.focus();
  }

  function onItemKey(e: KeyboardEvent, idx: number) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(Math.min(idx + 1, itemRefs.current.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(Math.max(idx - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(itemRefs.current.length - 1);
    }
  }

  return (
    <>
      {sections.map((section, si) => (
        <div
          key={si}
          style={{
            paddingBottom: si < sections.length - 1 ? 12 : 0,
            marginBottom: si < sections.length - 1 ? 4 : 0,
          }}
        >
          {section.heading && !collapsed ? (
            <p
              className="font-mt-mono"
              style={{
                margin: 0,
                padding: "10px 18px 6px",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "var(--mt-text-4)",
              }}
            >
              {section.heading}
            </p>
          ) : section.heading && collapsed ? (
            <div
              aria-hidden
              style={{
                height: 1,
                margin: "8px 12px",
                background: "var(--mt-hairline)",
              }}
            />
          ) : null}
          <ul style={{ listStyle: "none", margin: 0, padding: "0 8px", display: "grid", gap: 1 }}>
            {section.items.map((item) => {
              const idx = flatIndex++;
              return (
                <ItemRow
                  key={item.label}
                  item={item}
                  index={idx}
                  activeHref={activeHref}
                  collapsed={collapsed}
                  refs={itemRefs}
                  onKey={onItemKey}
                  navId={navId}
                  onItemClick={onItemClick}
                  parentExpanded={!!item.defaultExpanded}
                  depth={0}
                />
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

function ItemRow({
  item,
  index,
  activeHref,
  collapsed,
  refs,
  onKey,
  navId,
  onItemClick,
  parentExpanded,
  depth,
}: {
  item: SidebarItem;
  index: number;
  activeHref?: string;
  collapsed: boolean;
  refs: React.MutableRefObject<Array<HTMLAnchorElement | HTMLButtonElement | null>>;
  onKey: (e: KeyboardEvent, idx: number) => void;
  navId: string;
  onItemClick: () => void;
  parentExpanded: boolean;
  depth: number;
}) {
  const childActive =
    activeHref && item.children?.some((c) => c.href === activeHref);
  const [expanded, setExpanded] = useState(parentExpanded || !!childActive);

  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive]);

  const isActive = !!activeHref && item.href === activeHref;
  const tooltipId = `${navId}-tt-${index}`;

  function setRef(el: HTMLAnchorElement | HTMLButtonElement | null) {
    refs.current[index] = el;
  }

  function handleKey(e: KeyboardEvent) {
    if (item.children && item.children.length > 0) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setExpanded(true);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setExpanded(false);
        return;
      }
    }
    onKey(e, index);
  }

  const sharedStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: collapsed ? "10px 0" : `8px ${depth > 0 ? 28 : 12}px`,
    justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: "var(--mt-radius-2)",
    fontSize: 14,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? "var(--mt-text)" : "var(--mt-text-2)",
    background: isActive ? "var(--mt-soft-accent)" : "transparent",
    borderLeft: collapsed
      ? "none"
      : isActive
        ? "2px solid var(--mt-accent)"
        : "2px solid transparent",
    cursor: item.disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    transition: "background 140ms var(--mt-ease-out), color 140ms var(--mt-ease-out)",
    opacity: item.disabled ? 0.4 : 1,
    fontFamily: "var(--mt-font-sans)",
    position: "relative" as const,
  };

  function hoverIn(e: React.MouseEvent<HTMLElement>) {
    if (item.disabled || isActive) return;
    e.currentTarget.style.background = "var(--mt-surface-1)";
    e.currentTarget.style.color = "var(--mt-text)";
  }
  function hoverOut(e: React.MouseEvent<HTMLElement>) {
    if (item.disabled || isActive) return;
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.color = "var(--mt-text-2)";
  }

  const inner = (
    <>
      {item.icon ? (
        <span aria-hidden style={{ flexShrink: 0, display: "inline-grid", placeItems: "center", width: 18, height: 18 }}>
          {item.icon}
        </span>
      ) : (
        !collapsed && depth === 0 ? <span aria-hidden style={{ width: 18 }} /> : null
      )}
      {!collapsed ? (
        <>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.label}
          </span>
          {item.badge ? (
            <span
              className="font-mt-mono"
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--mt-text-3)",
                background: "var(--mt-surface-2)",
                border: "1px solid var(--mt-hairline)",
                padding: "1px 7px",
                borderRadius: 999,
              }}
            >
              {item.badge}
            </span>
          ) : null}
          {item.children && item.children.length > 0 ? (
            <ChevronDown
              size={14}
              aria-hidden
              style={{
                color: "var(--mt-text-3)",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 180ms var(--mt-ease-out)",
              }}
            />
          ) : null}
        </>
      ) : null}
    </>
  );

  const triggerProps = {
    onKeyDown: handleKey,
    onMouseEnter: hoverIn,
    onMouseLeave: hoverOut,
    style: sharedStyle,
    "aria-current": isActive ? ("page" as const) : undefined,
    "aria-describedby": collapsed ? tooltipId : undefined,
  };

  const trigger =
    item.children && item.children.length > 0 ? (
      <button
        type="button"
        ref={setRef as (el: HTMLButtonElement | null) => void}
        aria-expanded={expanded}
        disabled={item.disabled}
        onClick={() => setExpanded((v) => !v)}
        {...triggerProps}
      >
        {inner}
      </button>
    ) : item.href ? (
      <a
        href={item.href}
        ref={setRef as (el: HTMLAnchorElement | null) => void}
        onClick={() => {
          item.onClick?.();
          onItemClick();
        }}
        aria-disabled={item.disabled || undefined}
        {...triggerProps}
      >
        {inner}
      </a>
    ) : (
      <button
        type="button"
        ref={setRef as (el: HTMLButtonElement | null) => void}
        disabled={item.disabled}
        onClick={() => {
          item.onClick?.();
          onItemClick();
        }}
        {...triggerProps}
      >
        {inner}
      </button>
    );

  return (
    <li style={{ position: "relative" }}>
      {trigger}
      {collapsed && !item.disabled ? (
        <span
          role="tooltip"
          id={tooltipId}
          className="font-mt-mono"
          style={{
            position: "absolute",
            left: "calc(100% + 8px)",
            top: "50%",
            transform: "translateY(-50%)",
            background: "var(--mt-text)",
            color: "var(--mt-bg)",
            padding: "5px 9px",
            borderRadius: "var(--mt-radius-2)",
            fontSize: 11,
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 140ms var(--mt-ease-out)",
            zIndex: 1,
          }}
        >
          {item.label}
        </span>
      ) : null}
      <style>{`
        li:hover > [role="tooltip"] { opacity: 1; }
      `}</style>

      {/* Nested items */}
      {item.children && item.children.length > 0 && expanded && !collapsed ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 1 }}>
          {item.children.map((child) => {
            const childIsActive = !!activeHref && child.href === activeHref;
            return (
              <li key={child.label}>
                <a
                  href={child.href ?? "#"}
                  onClick={() => {
                    child.onClick?.();
                    onItemClick();
                  }}
                  aria-current={childIsActive ? "page" : undefined}
                  className="font-mt-sans"
                  style={{
                    display: "block",
                    padding: "6px 12px 6px 40px",
                    fontSize: 13,
                    color: childIsActive ? "var(--mt-text)" : "var(--mt-text-3)",
                    fontWeight: childIsActive ? 600 : 400,
                    background: childIsActive
                      ? "var(--mt-surface-1)"
                      : "transparent",
                    borderLeft: childIsActive
                      ? "2px solid var(--mt-accent)"
                      : "2px solid transparent",
                    marginLeft: 12,
                    borderRadius: "0 var(--mt-radius-2) var(--mt-radius-2) 0",
                    textDecoration: "none",
                    transition: "background 140ms var(--mt-ease-out), color 140ms var(--mt-ease-out)",
                  }}
                  onMouseEnter={(e) => {
                    if (!childIsActive) {
                      e.currentTarget.style.background = "var(--mt-surface-1)";
                      e.currentTarget.style.color = "var(--mt-text)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!childIsActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--mt-text-3)";
                    }
                  }}
                >
                  {child.label}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
