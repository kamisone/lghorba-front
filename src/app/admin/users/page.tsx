"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import styles from "./users.module.css";
import CreateUserModal from "@/components/admin/users/CreateUserModal";
import { useModalUrl } from "@/hooks/useModalUrl";
import { UserPlus, Search, X, SlidersHorizontal, ChevronDown, UserSearch } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  rentCount?: number;
  hasActiveSession?: boolean;
  score?: number;
  createdAt: string;
}

interface Filters {
  search: string;
  minRents: string;
  maxRents: string;
  minScore: string;
  maxScore: string;
  joinedFrom: string;
  joinedTo: string;
  rentFrom: string;
  rentTo: string;
  activeOnly: string; // "1" = on, "" = off
}

// ─── URL / filter helpers ─────────────────────────────────────────────────────

const EMPTY: Filters = {
  search: "", minRents: "", maxRents: "",
  minScore: "", maxScore: "",
  joinedFrom: "", joinedTo: "",
  rentFrom: "", rentTo: "",
  activeOnly: "",
};

function fromUrl(): Filters {
  if (typeof window === "undefined") return EMPTY;
  const sp = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    (Object.keys(EMPTY) as (keyof Filters)[]).map(k => [k, sp.get(k) ?? ""])
  ) as unknown as Filters;
}

function toUrl(f: Filters) {
  const sp = new URLSearchParams();
  (Object.entries(f) as [string, string][]).forEach(([k, v]) => { if (v) sp.set(k, v); });
  const q = sp.toString();
  window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
}

function toApiParams(f: Filters): string {
  const sp = new URLSearchParams({ limit: "100" });
  (Object.entries(f) as [string, string][]).forEach(([k, v]) => { if (v) sp.set(k, v); });
  return sp.toString();
}

function countActive(f: Filters): number {
  return (Object.values(f) as string[]).filter(Boolean).length;
}

const ADVANCED_KEYS: (keyof Filters)[] = [
  "minRents", "maxRents", "minScore", "maxScore",
  "joinedFrom", "joinedTo", "rentFrom", "rentTo", "activeOnly",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 8 ? styles.scoreHigh : score >= 5 ? styles.scoreMid : styles.scoreLow;
  return <span className={`${styles.scoreBadge} ${cls}`}>{score}/10</span>;
}

interface RangeFieldProps {
  label: string;
  minVal: string; maxVal: string;
  onMin: (v: string) => void; onMax: (v: string) => void;
  type?: "number" | "date";
  min?: number; max?: number;
  className?: string;
}

function RangeField({ label, minVal, maxVal, onMin, onMax, type = "number", min, max, className }: RangeFieldProps) {
  return (
    <div className={`${styles.filterGroup}${className ? ` ${className}` : ""}`}>
      <span className={styles.filterGroupLabel}>{label}</span>
      <div className={styles.rangeRow}>
        <input
          type={type}
          className={`${styles.rangeInput}${type === "date" ? ` ${styles.dateInput}` : ""}`}
          placeholder={type === "number" ? "Min" : undefined}
          min={min}
          max={max}
          value={minVal}
          onChange={e => onMin(e.target.value)}
        />
        <span className={styles.rangeSep}>{type === "date" ? "→" : "–"}</span>
        <input
          type={type}
          className={`${styles.rangeInput}${type === "date" ? ` ${styles.dateInput}` : ""}`}
          placeholder={type === "number" ? "Max" : undefined}
          min={min}
          max={max}
          value={maxVal}
          onChange={e => onMax(e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const usersFetcher = (params: string) =>
  fetch(`/next-api/users?${params}`, { cache: "no-store" }).then(r => (r.ok ? r.json() : []));

export default function UsersPage() {
  const { openModal, closeModal } = useModalUrl();
  // Both start pre-hydrated from the URL (not EMPTY) so the very first SWR
  // key is already the right one — no wasted unfiltered fetch before the
  // real, filtered one.
  const [filters,          setFilters]          = useState<Filters>(() => fromUrl());
  const [debouncedFilters, setDebouncedFilters]  = useState<Filters>(() => fromUrl());
  const [showCreate, setShowCreate] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isFirstFilterEffect = useRef(true);

  const params = toApiParams(debouncedFilters);
  // keepPreviousData: switching filters keeps showing the current results
  // (with isValidating true) instead of blanking the table on every change;
  // isLoading only turns on the very first time. Different filter
  // combinations cache independently, so returning to one you already used
  // this session is instant.
  const { data: users, isLoading, mutate } = useSWR<User[]>(
    `admin:users?${params}`,
    () => usersFetcher(params),
    { keepPreviousData: true },
  );

  // Mount-only: open the create modal / filter panel if the URL asks for it.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("modal") === "user-create") {
      setShowCreate(true);
    }
    if (ADVANCED_KEYS.some(k => filters[k])) setFiltersOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When filters change: sync URL + debounce before it becomes a new SWR key
  useEffect(() => {
    if (isFirstFilterEffect.current) { isFirstFilterEffect.current = false; return; }
    toUrl(filters);
    const t = setTimeout(() => setDebouncedFilters(filters), 300);
    return () => clearTimeout(t);
  }, [filters]);

  const set = useCallback(<K extends keyof Filters>(k: K, v: string) => {
    setFilters(p => ({ ...p, [k]: v }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(EMPTY);
    window.history.replaceState(null, "", window.location.pathname);
    setFiltersOpen(false);
  }, []);

  const nActive = countActive(filters);

  const chips = useMemo(() => {
    const out: { key: string; label: string; clear: () => void }[] = [];

    if (filters.search) out.push({
      key: "search",
      label: `"${filters.search}"`,
      clear: () => set("search", ""),
    });

    if (filters.minRents || filters.maxRents) out.push({
      key: "rents",
      label: filters.minRents && filters.maxRents
        ? `Rents ${filters.minRents}–${filters.maxRents}`
        : filters.minRents ? `Rents ≥ ${filters.minRents}` : `Rents ≤ ${filters.maxRents}`,
      clear: () => setFilters(p => ({ ...p, minRents: "", maxRents: "" })),
    });

    if (filters.minScore || filters.maxScore) out.push({
      key: "score",
      label: filters.minScore && filters.maxScore
        ? `Score ${filters.minScore}–${filters.maxScore}`
        : filters.minScore ? `Score ≥ ${filters.minScore}` : `Score ≤ ${filters.maxScore}`,
      clear: () => setFilters(p => ({ ...p, minScore: "", maxScore: "" })),
    });

    if (filters.joinedFrom || filters.joinedTo) out.push({
      key: "joined",
      label: filters.joinedFrom && filters.joinedTo
        ? `Joined ${filters.joinedFrom} → ${filters.joinedTo}`
        : filters.joinedFrom ? `Joined from ${filters.joinedFrom}` : `Joined until ${filters.joinedTo}`,
      clear: () => setFilters(p => ({ ...p, joinedFrom: "", joinedTo: "" })),
    });

    if (filters.rentFrom || filters.rentTo) out.push({
      key: "activity",
      label: filters.rentFrom && filters.rentTo
        ? `Activity ${filters.rentFrom} → ${filters.rentTo}`
        : filters.rentFrom ? `Activity from ${filters.rentFrom}` : `Activity until ${filters.rentTo}`,
      clear: () => setFilters(p => ({ ...p, rentFrom: "", rentTo: "" })),
    });

    if (filters.activeOnly) out.push({
      key: "activeOnly",
      label: "Currently renting",
      clear: () => set("activeOnly", ""),
    });

    return out;
  }, [filters, set]);

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Users</h1>
          {users && (
            <p className={styles.subtitle}>
              {users.length} {users.length === 1 ? "user" : "users"}
              {nActive > 0 ? " matching filters" : ""}
            </p>
          )}
        </div>
        <button
          className={styles.addBtn}
          onClick={() => { setShowCreate(true); openModal("user-create"); }}
        >
          <UserPlus size={16} strokeWidth={1.75} />
          Add User
        </button>
      </div>

      {/* ── Filter toolbar ── */}
      <div className={styles.filterToolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} strokeWidth={1.75} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name or phone…"
            value={filters.search}
            onChange={e => set("search", e.target.value)}
          />
          {filters.search && (
            <button className={styles.searchClear} onClick={() => set("search", "")} aria-label="Clear search">
              <X size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <button
          className={`${styles.filterToggle}${filtersOpen ? ` ${styles.filterToggleActive}` : ""}`}
          onClick={() => setFiltersOpen(v => !v)}
        >
          <SlidersHorizontal size={16} strokeWidth={1.75} />
          Filters
          {nActive > 0 && <span className={styles.filterBadge}>{nActive}</span>}
          <ChevronDown size={16} strokeWidth={1.75} className={`${styles.filterChevron}${filtersOpen ? ` ${styles.filterChevronOpen}` : ""}`} />
        </button>

        {nActive > 0 && (
          <button className={styles.clearBtn} onClick={clearAll}>Clear all</button>
        )}
      </div>

      {/* ── Filter panel ── */}
      <div className={`${styles.filterPanel}${filtersOpen ? ` ${styles.filterPanelOpen}` : ""}`}>
        <div className={styles.filterPanelInner}>
          <RangeField
            label="Rents"
            minVal={filters.minRents} maxVal={filters.maxRents}
            onMin={v => set("minRents", v)} onMax={v => set("maxRents", v)}
            min={0}
          />
          <div className={styles.filterDivider} />
          <RangeField
            label="Score /10"
            minVal={filters.minScore} maxVal={filters.maxScore}
            onMin={v => set("minScore", v)} onMax={v => set("maxScore", v)}
            min={0} max={10}
          />
          <div className={styles.filterDivider} />
          <RangeField
            label="Joined Date"
            type="date"
            minVal={filters.joinedFrom} maxVal={filters.joinedTo}
            onMin={v => set("joinedFrom", v)} onMax={v => set("joinedTo", v)}
            className={styles.filterGroupWide}
          />
          <div className={styles.filterDivider} />
          <RangeField
            label="Rent Activity"
            type="date"
            minVal={filters.rentFrom} maxVal={filters.rentTo}
            onMin={v => set("rentFrom", v)} onMax={v => set("rentTo", v)}
            className={styles.filterGroupWide}
          />
          <div className={styles.filterDivider} />
          <div className={`${styles.filterGroup} ${styles.filterGroupWide}`}>
            <span className={styles.filterGroupLabel}>Status</span>
            <button
              className={`${styles.activeOnlyBtn}${filters.activeOnly ? ` ${styles.activeOnlyBtnOn}` : ""}`}
              onClick={() => set("activeOnly", filters.activeOnly ? "" : "1")}
            >
              <span className={styles.activeOnlyDot} />
              Currently renting
            </button>
          </div>
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {chips.length > 0 && (
        <div className={styles.chipList}>
          {chips.map(c => (
            <span key={c.key} className={styles.chip}>
              {c.label}
              <button className={styles.chipX} onClick={c.clear} aria-label={`Remove ${c.label}`}>
                <X size={14} strokeWidth={1.75} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {isLoading ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Rents</th>
                <th>Score</th>
                <th>Joined</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>
                  <td><span className={styles.skeletonCell} style={{ width: "60%" }} /></td>
                  <td><span className={styles.skeletonCell} style={{ width: "70%" }} /></td>
                  <td><span className={styles.skeletonCell} style={{ width: "24px" }} /></td>
                  <td><span className={styles.skeletonCell} style={{ width: "40px" }} /></td>
                  <td><span className={styles.skeletonCell} style={{ width: "80px" }} /></td>
                  <td><span className={styles.skeletonCell} style={{ width: "40px" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !users || users.length === 0 ? (
        <div className={styles.emptyState}>
          <UserSearch size={48} strokeWidth={1.75} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>
            {nActive > 0 ? "No users match these filters" : "No users yet"}
          </p>
          <p className={styles.emptyHint}>
            {nActive > 0
              ? "Try adjusting or clearing your filters."
              : "Users are created automatically when a rent session is saved."}
          </p>
          {nActive > 0 && (
            <button className={styles.emptyReset} onClick={clearAll}>Clear filters</button>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Rents</th>
                <th>Score</th>
                <th>Joined</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className={styles.nameCell}>
                    <div className={styles.namePrimary}>{u.name}</div>
                    {u.email && <div className={styles.nameSub}>{u.email}</div>}
                  </td>
                  <td>{u.phone || <span className={styles.na}>—</span>}</td>
                  <td>
                    <div className={styles.rentCell}>
                      {u.rentCount != null && u.rentCount > 0
                        ? <span className={styles.rentBadge}>{u.rentCount}</span>
                        : <span className={styles.na}>0</span>}
                      {u.hasActiveSession && (
                        <span className={styles.activeDot} title="Ongoing session" />
                      )}
                    </div>
                  </td>
                  <td>
                    {u.score != null
                      ? <ScoreBadge score={u.score} />
                      : <span className={styles.na}>—</span>}
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(u.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </td>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className={styles.viewBtn}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => { setShowCreate(false); closeModal(); }}
          onCreated={() => { setShowCreate(false); closeModal(); mutate(); }}
        />
      )}
    </div>
  );
}
