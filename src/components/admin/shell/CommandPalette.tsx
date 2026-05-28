"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Car, CalendarDays, CalendarCheck, Receipt, Tag, Activity,
  User, Mail, Key, Bell, MailOpen, Wrench, ShieldCheck,
  Package, Warehouse, FileText, Settings, Search, X, ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import styles from "./CommandPalette.module.css";

// ── Static nav entries ────────────────────────────────────────────────────────

interface NavEntry {
  type:        "nav";
  label:       string;
  description: string;
  icon:        LucideIcon;
  href:        string;
}

const NAV_ENTRIES: NavEntry[] = [
  { type: "nav", label: "Fleet",         description: "Manage vehicles",           icon: Car,         href: "/admin/fleet"                   },
  { type: "nav", label: "Calendar",      description: "Booking calendar",          icon: CalendarDays,href: "/admin/calendar"                },
  { type: "nav", label: "Bookings",      description: "All bookings",              icon: CalendarCheck,href: "/admin/bookings"               },
  { type: "nav", label: "Invoices",      description: "Billing & invoices",        icon: Receipt,     href: "/admin/invoices"                },
  { type: "nav", label: "Promotions",    description: "Coupon codes",              icon: Tag,         href: "/admin/promotions"              },
  { type: "nav", label: "Analytics",     description: "Reports & statistics",      icon: Activity,    href: "/admin/analytics"               },
  { type: "nav", label: "Users",         description: "Customer accounts",         icon: User,        href: "/admin/users"                   },
  { type: "nav", label: "Contacts",      description: "Contact form submissions",  icon: Mail,        href: "/admin/contacts"                },
  { type: "nav", label: "Guest Access",  description: "Temporary access tokens",   icon: Key,         href: "/admin/guest-access"            },
  { type: "nav", label: "Reminders",     description: "SMS & email reminders",     icon: Bell,        href: "/admin/notifications/reminders" },
  { type: "nav", label: "Email Import",  description: "IMAP booking ingestion",    icon: MailOpen,    href: "/admin/email-ingestion"         },
  { type: "nav", label: "Maintenance",   description: "Maintenance scheduling",    icon: Wrench,      href: "/admin/maintenance"             },
  { type: "nav", label: "Admins",        description: "Administrator accounts",    icon: ShieldCheck, href: "/admin/admins"                  },
  { type: "nav", label: "Shop Products", description: "Product catalog",           icon: Package,     href: "/admin/shop/products"           },
  { type: "nav", label: "Shop Orders",   description: "Customer orders",           icon: CalendarCheck,href:"/admin/shop/orders"             },
  { type: "nav", label: "Shop Inventory",description: "Stock management",          icon: Warehouse,   href: "/admin/shop/inventory"          },
  { type: "nav", label: "Price Rules",   description: "Flash sales & discounts",   icon: Tag,         href: "/admin/shop/price-rules"        },
  { type: "nav", label: "Content",       description: "Site content management",   icon: FileText,    href: "/admin/content"                 },
  { type: "nav", label: "Settings",      description: "Platform configuration",    icon: Settings,    href: "/admin/settings"                },
];

// ── Car result type ───────────────────────────────────────────────────────────

interface CarResult {
  type:        "car";
  id:          string;
  label:       string;
  description: string;
}

type Result = NavEntry | CarResult;

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const router      = useRouter();
  const inputRef    = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);
  const [query,     setQuery]     = useState("");
  const [cars,      setCars]      = useState<CarResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    api.admin.cars.list()
      .then(data => {
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

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.panel} onMouseDown={e => e.stopPropagation()}>

        <div className={styles.inputRow}>
          <Search size={16} strokeWidth={1.75} className={styles.searchIcon} />
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
            <button
              className={styles.clearBtn}
              onMouseDown={e => { e.preventDefault(); setQuery(""); setActiveIdx(0); inputRef.current?.focus(); }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
          <kbd className={styles.escHint}>esc</kbd>
        </div>

        <ul className={styles.list} ref={listRef}>
          {results.length === 0 && (
            <li className={styles.empty}>No results for &ldquo;{query}&rdquo;</li>
          )}

          {navResults.length > 0 && (
            <li className={styles.sectionLabel}>{q ? "Pages" : "Navigation"}</li>
          )}
          {navResults.map((r, i) => {
            const nav = r as NavEntry;
            return (
              <li
                key={nav.href}
                className={`${styles.item} ${activeIdx === i ? styles.itemActive : ""}`}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={() => handleSelect(r)}
              >
                <nav.icon size={16} strokeWidth={1.75} className={styles.itemIcon} />
                <div className={styles.itemText}>
                  <span className={styles.itemLabel}>{nav.label}</span>
                  <span className={styles.itemDesc}>{nav.description}</span>
                </div>
                <ArrowRight size={14} strokeWidth={1.75} className={styles.itemArrow} />
              </li>
            );
          })}

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
                <Car size={16} strokeWidth={1.75} className={styles.itemIcon} />
                <div className={styles.itemText}>
                  <span className={styles.itemLabel}>{car.label}</span>
                  <span className={styles.itemDesc}>{car.description}</span>
                </div>
                <ArrowRight size={14} strokeWidth={1.75} className={styles.itemArrow} />
              </li>
            );
          })}
        </ul>

        <div className={styles.footer}>
          <span className={styles.footerHint}><kbd>↑↓</kbd> navigate</span>
          <span className={styles.footerHint}><kbd>↵</kbd> open</span>
          <span className={styles.footerHint}><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
