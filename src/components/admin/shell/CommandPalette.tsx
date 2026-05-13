"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./CommandPalette.module.css";

// ── Static nav entries ────────────────────────────────────────────────────────

interface NavEntry {
  type: "nav";
  label: string;
  description: string;
  icon: string;
  href: string;
}

const NAV_ENTRIES: NavEntry[] = [
  { type: "nav", label: "Fleet",        description: "Manage vehicles",           icon: "directions_car",       href: "/admin/fleet"                      },
  { type: "nav", label: "Calendar",     description: "Booking calendar",          icon: "calendar_month",       href: "/admin/calendar"                   },
  { type: "nav", label: "Bookings",     description: "All bookings",              icon: "event_available",      href: "/admin/bookings"                   },
  { type: "nav", label: "Invoices",     description: "Billing & invoices",        icon: "receipt_long",         href: "/admin/invoices"                   },
  { type: "nav", label: "Promotions",   description: "Coupon codes",              icon: "sell",                 href: "/admin/promotions"                 },
  { type: "nav", label: "Analytics",    description: "Reports & statistics",      icon: "monitoring",           href: "/admin/analytics"                  },
  { type: "nav", label: "Users",        description: "Customer accounts",         icon: "person",               href: "/admin/users"                      },
  { type: "nav", label: "Contacts",     description: "Contact form submissions",  icon: "mail",                 href: "/admin/contacts"                   },
  { type: "nav", label: "Guest Access", description: "Temporary access tokens",   icon: "key",                  href: "/admin/guest-access"               },
  { type: "nav", label: "Reminders",    description: "SMS & email reminders",     icon: "notifications",        href: "/admin/notifications/reminders"    },
  { type: "nav", label: "Email Import", description: "IMAP booking ingestion",    icon: "mark_email_unread",    href: "/admin/email-ingestion"            },
  { type: "nav", label: "Maintenance",  description: "Maintenance scheduling",    icon: "build",                href: "/admin/maintenance"                },
  { type: "nav", label: "Admins",       description: "Administrator accounts",    icon: "admin_panel_settings", href: "/admin/admins"                     },
  { type: "nav", label: "Content",      description: "Site content management",   icon: "article",              href: "/admin/content"                    },
  { type: "nav", label: "Settings",     description: "Platform configuration",    icon: "settings",             href: "/admin/settings"                   },
];

// ── Car result type ───────────────────────────────────────────────────────────

interface CarResult {
  type: "car";
  id: string;
  label: string;
  description: string;
}

// ── Combined result ───────────────────────────────────────────────────────────

type Result = NavEntry | CarResult;

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const router      = useRouter();
  const inputRef    = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);
  const [query,     setQuery]     = useState("");
  const [cars,      setCars]      = useState<CarResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Fetch cars once when palette opens
  useEffect(() => {
    if (!open) return;
    fetch("/next-api/cars", { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; name: string; brand?: string | null; model?: string | null; immatriculation?: string | null }>) => {
        setCars(data.map(c => ({
          type: "car" as const,
          id: c.id,
          label: [c.brand, c.model, c.name].filter(Boolean).join(" ") || c.name,
          description: c.immatriculation ?? "Vehicle",
        })));
      })
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 30);
    setQuery("");
    setActiveIdx(0);
  }, [open]);

  // Keyboard shortcut to open (handled by parent, but also close on Escape here)
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter")     { e.preventDefault(); handleSelect(results[activeIdx]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIdx]);

  // Build filtered results
  const q = query.trim();

  const navResults: Result[] = q
    ? NAV_ENTRIES.filter(n => matchesQuery(n.label, q) || matchesQuery(n.description, q))
    : NAV_ENTRIES;

  const carResults: Result[] = cars.filter(c =>
    !q || matchesQuery(c.label, q) || matchesQuery(c.description, q),
  );

  const results: Result[] = [
    ...navResults,
    ...(q || carResults.length > 0 ? carResults : []),
  ];

  const handleSelect = useCallback((result: Result | undefined) => {
    if (!result) return;
    if (result.type === "nav") router.push(result.href);
    else router.push(`/admin/fleet/${result.id}/management`);
    onClose();
  }, [router, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.panel} onMouseDown={e => e.stopPropagation()}>

        {/* Search input */}
        <div className={styles.inputRow}>
          <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search pages, vehicles…"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className={styles.clearBtn} onMouseDown={e => { e.preventDefault(); setQuery(""); setActiveIdx(0); inputRef.current?.focus(); }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
          <kbd className={styles.escHint}>esc</kbd>
        </div>

        {/* Results */}
        <ul className={styles.list} ref={listRef}>
          {results.length === 0 && (
            <li className={styles.empty}>No results for &ldquo;{query}&rdquo;</li>
          )}

          {/* Section header: Pages */}
          {navResults.length > 0 && (
            <li className={styles.sectionLabel}>
              {q ? "Pages" : "Navigation"}
            </li>
          )}
          {navResults.map((r, i) => (
            <li
              key={r.type === "nav" ? r.href : r.id}
              className={`${styles.item} ${activeIdx === i ? styles.itemActive : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={() => handleSelect(r)}
            >
              <span className={`material-symbols-outlined ${styles.itemIcon}`}>
                {r.type === "nav" ? r.icon : "directions_car"}
              </span>
              <div className={styles.itemText}>
                <span className={styles.itemLabel}>{r.label}</span>
                <span className={styles.itemDesc}>{r.type === "nav" ? r.description : r.description}</span>
              </div>
              <span className={`material-symbols-outlined ${styles.itemArrow}`}>arrow_forward</span>
            </li>
          ))}

          {/* Section header: Vehicles */}
          {carResults.length > 0 && (
            <li className={styles.sectionLabel}>Vehicles</li>
          )}
          {carResults.map((r, i) => {
            const idx = navResults.length + i;
            const car = r as CarResult;
            return (
              <li
                key={car.id}
                className={`${styles.item} ${activeIdx === idx ? styles.itemActive : ""}`}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseDown={() => handleSelect(r)}
              >
                <span className={`material-symbols-outlined ${styles.itemIcon}`}>directions_car</span>
                <div className={styles.itemText}>
                  <span className={styles.itemLabel}>{r.label}</span>
                  <span className={styles.itemDesc}>{r.description}</span>
                </div>
                <span className={`material-symbols-outlined ${styles.itemArrow}`}>arrow_forward</span>
              </li>
            );
          })}
        </ul>

        {/* Footer hints */}
        <div className={styles.footer}>
          <span className={styles.footerHint}><kbd>↑↓</kbd> navigate</span>
          <span className={styles.footerHint}><kbd>↵</kbd> open</span>
          <span className={styles.footerHint}><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
