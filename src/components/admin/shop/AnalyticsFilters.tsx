"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
 * so the chip shows a name rather than a bare UUID. `testOnly` restricts the
 * search to test products.
 * ────────────────────────────────────────────────────────────────────────── */
interface ProductOption {
  id: string;
  title: string;
}

export function ProductPicker({
  value,
  onChange,
  label = "Product",
  testOnly = false,
}: {
  value: string;
  onChange: (productId: string) => void;
  label?: string;
  testOnly?: boolean;
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
      if (testOnly) params.set("isTestProduct", "true");
      fetch(`/next-api/shop/products?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((data) => {
          const items = Array.isArray(data.items) ? data.items : [];
          setResults(items.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })));
        })
        .catch(() => setResults([]));
    }, q ? 250 : 0);
    return () => clearTimeout(handle);
  }, [term, testOnly, value, open]);

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
            <span>{selectedTitle || "Selected product"}</span>
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
              placeholder={testOnly ? "Search test products…" : "Search products…"}
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
                <div key={opt.id} className={styles.productPickerItem} onClick={() => select(opt)}>
                  {opt.title}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
