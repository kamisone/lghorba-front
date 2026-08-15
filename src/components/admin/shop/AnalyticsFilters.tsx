"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast/ToastContext";
import styles from "./ShopAdmin.module.css";

/* ────────────────────────────────────────────────────────────────────────────
 * URL-synced filter state
 *
 * Filters live in the query string so a refresh, a shared link, or the back
 * button lands on the same view (same idea as the Media Library page). Values
 * are derived straight from `useSearchParams` each render — no duplicated state.
 * `defaults` MUST be a stable (module-level) object so the memo stays stable.
 * Consumers must render the page body inside a <Suspense> boundary because
 * useSearchParams suspends during prerender.
 * ────────────────────────────────────────────────────────────────────────── */
export function useUrlFilters<T extends Record<string, string>>(
  defaults: T,
): readonly [T, (patch: Partial<T>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(() => {
    const out = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const v = searchParams.get(key as string);
      if (v !== null) out[key] = v as T[keyof T];
    }
    return out;
  }, [searchParams, defaults]);

  const setFilters = useCallback(
    (patch: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        // Drop params equal to their default or empty, keeping URLs clean.
        if (value === undefined || value === "" || value === defaults[key]) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, defaults],
  );

  return [values, setFilters] as const;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Date range
 * ────────────────────────────────────────────────────────────────────────── */
export const DATE_PRESETS: Array<{ value: string; label: string }> = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "month", label: "This month" },
  { value: "lastmonth", label: "Last month" },
  { value: "custom", label: "Custom range…" },
];

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Map a preset (or custom range) to the backend query params. Numeric presets
 * send `days`; the named presets and custom ranges send explicit start/end dates.
 */
export function dateRangeToQuery(
  range: string,
  startDate: string,
  endDate: string,
): Record<string, string> {
  const now = new Date();
  const today = fmtDate(now);

  switch (range) {
    case "today":
      return { startDate: today, endDate: today };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { startDate: fmtDate(y), endDate: fmtDate(y) };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: fmtDate(first), endDate: today };
    }
    case "lastmonth": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: fmtDate(first), endDate: fmtDate(last) };
    }
    case "custom":
      return {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      };
    default:
      // Numeric day count.
      return { days: range };
  }
}

export function DateRangeFilter({
  range,
  startDate,
  endDate,
  onChange,
}: {
  range: string;
  startDate: string;
  endDate: string;
  onChange: (patch: { range?: string; startDate?: string; endDate?: string }) => void;
}) {
  return (
    <>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Date range</label>
        <select
          className={styles.filterSelect}
          value={range}
          onChange={(e) => onChange({ range: e.target.value })}
        >
          {DATE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {range === "custom" && (
        <>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>From</label>
            <input
              type="date"
              className={styles.filterInput}
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => onChange({ startDate: e.target.value })}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>To</label>
            <input
              type="date"
              className={styles.filterInput}
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => onChange({ endDate: e.target.value })}
            />
          </div>
        </>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Generic controls
 * ────────────────────────────────────────────────────────────────────────── */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
}) {
  return (
    <div className={styles.filterGroup}>
      <label className={styles.filterLabel}>{label}</label>
      <select
        className={styles.filterSelect}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterSearch({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className={styles.filterGroup}>
      <label className={styles.filterLabel}>{label}</label>
      <input
        type="search"
        className={styles.filterInput}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function FilterToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.filterToggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Product typeahead
 *
 * Searches the admin product list as the user types (debounced). When a product
 * is already selected (e.g. restored from the URL), its title is resolved by id
 * so the chip shows a name rather than a bare UUID. `scope` restricts the search
 * to test products or to the real catalogue — the two analytics reports each
 * cover one and must not offer products from the other.
 * ────────────────────────────────────────────────────────────────────────── */
interface ProductOption {
  id: string;
  title: string;
}

/** Cap a product title at 20 chars, appending "..." when longer. */
function truncateTitle(title: string, max = 20): string {
  return title.length > max ? `${title.slice(0, max)}...` : title;
}

export function ProductPicker({
  value,
  onChange,
  label = "Product",
  testOnly = false,
  scope,
}: {
  value: string;
  onChange: (productId: string) => void;
  label?: string;
  /** Deprecated alias for scope="test"; kept so existing callers keep working. */
  testOnly?: boolean;
  scope?: "test" | "real";
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const boxRef = useRef<HTMLDivElement>(null);

  // Resolve the selected product's title by id (URL restore / external change).
  useEffect(() => {
    if (!value) {
      setSelectedTitle("");
      return;
    }
    let cancelled = false;
    fetch(`/next-api/shop/products/${value}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!cancelled && p?.title) setSelectedTitle(p.title);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value]);

  // Combobox behaviour: while open with no product selected, always show a list —
  // an initial page of products when the box is empty, and live search results as
  // the admin types. Empty term loads immediately; typed terms are debounced.
  useEffect(() => {
    if (value || !open) {
      setResults([]);
      return;
    }
    const q = term.trim();
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ limit: "10" });
      if (q.length >= 1) params.set("search", q);
      const effectiveScope = scope ?? (testOnly ? "test" : undefined);
      if (effectiveScope === "test") params.set("isTestProduct", "true");
      else if (effectiveScope === "real") params.set("isTestProduct", "false");
      fetch(`/next-api/shop/products?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((data) => {
          const items = Array.isArray(data.items) ? data.items : [];
          setResults(items.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })));
        })
        .catch(() => setResults([]));
    }, q ? 250 : 0);
    return () => clearTimeout(handle);
  }, [term, testOnly, scope, value, open]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const select = (opt: ProductOption) => {
    setSelectedTitle(opt.title);
    setTerm("");
    setResults([]);
    setOpen(false);
    onChange(opt.id);
  };

  const clear = () => {
    setSelectedTitle("");
    setTerm("");
    setResults([]);
    onChange("");
  };

  return (
    <div className={styles.filterGroup}>
      <label className={styles.filterLabel}>{label}</label>
      <div className={styles.productPicker} ref={boxRef}>
        {value ? (
          <div className={styles.productPickerChip}>
            <span title={selectedTitle || undefined}>
              {selectedTitle ? truncateTitle(selectedTitle) : "Selected product"}
            </span>
            <button type="button" className={styles.productPickerClear} onClick={clear} aria-label="Clear product">
              ×
            </button>
          </div>
        ) : (
          <div className={styles.productPickerControl}>
            <input
              type="search"
              className={styles.productPickerInput}
              value={term}
              placeholder={(scope ?? (testOnly ? "test" : undefined)) === "test" ? "Search test products…" : "Search products…"}
              onChange={(e) => {
                setTerm(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
          </div>
        )}
        {open && !value && (
          <div className={styles.productPickerMenu}>
            {results.length === 0 ? (
              <div className={styles.productPickerEmpty}>
                {term.trim() ? "No matching products" : "No products found"}
              </div>
            ) : (
              results.map((opt) => (
                <div
                  key={opt.id}
                  className={styles.productPickerItem}
                  onClick={() => select(opt)}
                  title={opt.title}
                >
                  {truncateTitle(opt.title)}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Detail modal
 *
 * Click-through drill-down for a funnel step / product row / country. Fetches
 * the raw underlying rows (behavior events or paid orders) with their exact
 * timestamps and shows them in a table.
 * ────────────────────────────────────────────────────────────────────────── */
export type DetailKind = "event" | "purchase";

interface EventDetailRow {
  id: string;
  eventType: string;
  createdAt: string;
  productTitle: string | null;
  countryName: string | null;
  cartToken: string | null;
  quantity: number | null;
  /** Null for rows recorded before this was captured. */
  clientIp: string | null;
  /** 'mobile' | 'desktop', null when no User-Agent was available to classify. */
  device: string | null;
}

interface PurchaseDetailRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  totalCents: number;
  countryName: string | null;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/** Full set of behavior event types, for the in-modal event-name filter. */
export const EVENT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "product_view", label: "Product view" },
  { value: "add_to_cart", label: "Added to cart" },
  // Same wording as the funnel bar and the test-product table columns: these are
  // two different steps, and calling one of them by its raw event name made them
  // read as duplicates of each other.
  { value: "checkout_started", label: "Reached shipping" },
  { value: "test_checkout_blocked", label: "Reached checkout (test)" },
  { value: "update_cart_item", label: "Cart updated" },
  { value: "remove_from_cart", label: "Removed from cart" },
  { value: "search", label: "Search" },
];

/** Raw event name -> the wording used everywhere else in the analytics UI. */
export function eventTypeLabel(value: string): string {
  return EVENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// Scope params that are NOT the modal's own date/event controls.
const SCOPE_KEYS = ["days", "startDate", "endDate", "eventType"];

export function AnalyticsDetailModal({
  open,
  onClose,
  title,
  subtitle,
  kind,
  params,
  eventOptions = EVENT_TYPE_OPTIONS,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  kind: DetailKind;
  params: Record<string, string>;
  /** Event types selectable in the modal's event-name filter. */
  eventOptions?: Array<{ value: string; label: string }>;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<(EventDetailRow | PurchaseDetailRow)[]>([]);
  const [blockedIps, setBlockedIps] = useState<Set<string>>(new Set());
  const [blockingIp, setBlockingIp] = useState<string | null>(null);

  const blockIp = useCallback(async (ip: string) => {
    setBlockingIp(ip);
    try {
      const res = await fetch("/next-api/admin/shop/analytics-excluded-ips/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      if (!res.ok) throw new Error();
      setBlockedIps((prev) => new Set(prev).add(ip));
      toast.success(`${ip} added to the analytics exclusion list`);
    } catch {
      toast.error(`Failed to block ${ip}`);
    } finally {
      setBlockingIp(null);
    }
  }, [toast]);

  // The modal owns its own date + event filters, seeded from the clicked scope.
  // Seeded lazily from `params` (not a plain "30"/""/"" default) so the very
  // first render — and therefore the very first fetch below — already uses the
  // clicked scope's date range. The component fully unmounts/remounts on every
  // open (callers render it behind `{modal && <AnalyticsDetailModal .../>}`),
  // so this is a fresh mount every time and lazy state is safe. Without this,
  // the first fetch fired with the "30" default before the seed effect below
  // could apply its setState calls, then a *second* fetch fired with the
  // correct seeded range — and with no ordering guard, the wider/slower
  // default-range request could resolve after the correct one and silently
  // overwrite it, showing unfiltered results until something else (e.g. the
  // event dropdown) triggered another fetch.
  const [range, setRange] = useState(() => (params.startDate || params.endDate) ? "custom" : (params.days ?? "30"));
  const [startDate, setStartDate] = useState(() => params.startDate ?? "");
  const [endDate, setEndDate] = useState(() => params.endDate ?? "");
  const [eventType, setEventType] = useState(() =>
    params.eventType && !params.eventType.includes(",") ? params.eventType : "",
  );

  const seedKey = new URLSearchParams(params).toString();
  useEffect(() => {
    if (!open) return;
    if (params.startDate || params.endDate) {
      setRange("custom");
      setStartDate(params.startDate ?? "");
      setEndDate(params.endDate ?? "");
    } else {
      setRange(params.days ?? "30");
      setStartDate("");
      setEndDate("");
    }
    // A single incoming type preselects it; a comma-list (e.g. a product row)
    // starts as "All" so every relevant event type shows.
    setEventType(params.eventType && !params.eventType.includes(",") ? params.eventType : "");
  }, [open, seedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effective fetch params: scope (productId/country/limit) + modal date + event.
  const effParams = useMemo(() => {
    const p: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (!SCOPE_KEYS.includes(k)) p[k] = v;
    }
    Object.assign(p, dateRangeToQuery(range, startDate, endDate));
    // Empty eventType ("All events") sends no filter, so every type is returned.
    if (kind === "event" && eventType) p.eventType = eventType;
    return p;
  }, [params, range, startDate, endDate, eventType, kind]);

  const effKey = new URLSearchParams(effParams).toString();
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const endpoint = kind === "event" ? "event-details" : "purchase-details";
    fetch(`/next-api/admin/shop/analytics/${endpoint}?${effKey}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (!cancelled) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // A newer effKey (date/event/scope change) cancels this request's effect
    // on the way out, so an in-flight response from a now-superseded filter
    // can never land after — and overwrite — a more recent one.
    return () => { cancelled = true; };
  }, [open, kind, effKey]);

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>{title}</h3>
            {subtitle && <div className={styles.modalSubtitle}>{subtitle}</div>}
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* In-modal filters: date range (+ presets) and, for events, event name. */}
        <div className={styles.modalFilters}>
          <DateRangeFilter
            range={range}
            startDate={startDate}
            endDate={endDate}
            onChange={(patch) => {
              if (patch.range !== undefined) setRange(patch.range);
              if (patch.startDate !== undefined) setStartDate(patch.startDate);
              if (patch.endDate !== undefined) setEndDate(patch.endDate);
            }}
          />
          {kind === "event" && (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Event</label>
              <select
                className={styles.filterSelect}
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="">All events</option>
                {eventOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className={styles.modalBody}>
          {loading ? (
            <span className={styles.skeleton} style={{ height: 180, width: "100%", borderRadius: 10, display: "block" }} />
          ) : rows.length === 0 ? (
            <div className={styles.modalEmpty}>No records for this selection.</div>
          ) : kind === "event" ? (
            <table className={styles.table}>
              <thead>
                <tr><th>Date &amp; time</th><th>Event</th><th>Product</th><th>Country</th><th>Device</th><th>Qty</th><th>IP</th><th /></tr>
              </thead>
              <tbody>
                {(rows as EventDetailRow[]).map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.createdAt)}</td>
                    <td><span className={styles.eventTypeTag} title={r.eventType}>{eventTypeLabel(r.eventType)}</span></td>
                    <td title={r.productTitle ?? undefined}>{r.productTitle ? truncateTitle(r.productTitle, 30) : "—"}</td>
                    <td>{r.countryName ?? "—"}</td>
                    <td>{r.device === "mobile" ? "Mobile" : r.device === "desktop" ? "Desktop" : "—"}</td>
                    <td>{r.quantity ?? "—"}</td>
                    <td style={{ whiteSpace: "nowrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                      {r.clientIp ?? "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.clientIp && (
                        blockedIps.has(r.clientIp) ? (
                          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Blocked</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => blockIp(r.clientIp!)}
                            disabled={blockingIp === r.clientIp}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: "3px 9px",
                              borderRadius: 6,
                              border: "1px solid var(--color-error-border)",
                              background: "var(--color-error-bg)",
                              color: "var(--color-error)",
                              cursor: blockingIp === r.clientIp ? "not-allowed" : "pointer",
                              opacity: blockingIp === r.clientIp ? 0.6 : 1,
                            }}
                          >
                            {blockingIp === r.clientIp ? "Blocking…" : "Block IP"}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr><th>Date &amp; time</th><th>Order</th><th>Status</th><th>Total</th><th>Country</th></tr>
              </thead>
              <tbody>
                {(rows as PurchaseDetailRow[]).map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.createdAt)}</td>
                    <td>{r.orderNumber}</td>
                    <td>{r.status}</td>
                    <td>{(r.totalCents / 100).toFixed(2)}</td>
                    <td>{r.countryName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
