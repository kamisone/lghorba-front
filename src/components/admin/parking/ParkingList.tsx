"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import styles from "./ParkingList.module.css";
import ParkingFormModal from "./ParkingFormModal";
import ParkingDetailPanel from "./ParkingDetailPanel";

const ParkingMap = dynamic(() => import("./ParkingMap"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

export type ParkingStatus = "active" | "inactive" | "maintenance" | "blocked";
export type ParkingType = "covered" | "outdoor" | "underground" | "garage" | "street" | "other";

export interface ParkingOwnerPhone {
  id: string;
  phoneNumber: string;
  label: string | null;
  sortOrder: number;
}

export interface ParkingDocument {
  id: string;
  gcsKey: string;
  originalName: string | null;
  docType: "photo" | "contract" | "invoice" | "other";
  caption: string | null;
}

export interface Car {
  id: string;
  name: string;
  immatriculation: string;
  photo: string | null;
}

export interface Parking {
  id: string;
  label: string;
  address: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  monthlyRentEur: number | null;
  cautionEur: number | null;
  paymentDueDay: number | null;
  ownerName: string | null;
  status: ParkingStatus;
  parkingType: ParkingType | null;
  accessInstructions: string | null;
  pedestrianCode: string | null;
  gateCode: string | null;
  dimensionNotes: string | null;
  comments: string | null;
  isActive: boolean;
  ownerPhones: ParkingOwnerPhone[];
  documents: ParkingDocument[];
  cars?: Car[];
  createdAt: string;
  updatedAt: string;
}

export interface ParkingAnalytics {
  totalActive: number;
  totalMonthlyRent: number;
  totalCaution: number;
  occupancyRate: number;
  occupiedCount: number;
  unusedCount: number;
  vehiclesWithoutParking: number;
  costByCity: Record<string, number>;
  byStatus: Record<string, number>;
  unusedParkings: Array<{ id: string; label: string; city: string | null; monthlyRentEur: number | null }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ParkingStatus, string> = {
  active: "Active", inactive: "Inactive", maintenance: "Maintenance", blocked: "Blocked",
};
const STATUS_COLOR: Record<ParkingStatus, string> = {
  active: "#22c55e", inactive: "#94a3b8", maintenance: "#f59e0b", blocked: "#ef4444",
};
const TYPE_LABEL: Record<ParkingType, string> = {
  covered: "Covered", outdoor: "Outdoor", underground: "Underground",
  garage: "Garage", street: "Street", other: "Other",
};

function fmtEur(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ParkingStatus }) {
  return (
    <span className={styles.badge} style={{ background: STATUS_COLOR[status] + "20", color: STATUS_COLOR[status] }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function AnalyticsBar({ data }: { data: ParkingAnalytics }) {
  return (
    <div className={styles.analyticsBar}>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Active parkings</div>
        <div className={styles.statValue}>{data.totalActive}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Total monthly cost</div>
        <div className={styles.statValue} style={{ color: "#ef4444" }}>{fmtEur(data.totalMonthlyRent)}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Deposits held</div>
        <div className={styles.statValue} style={{ color: "#f59e0b" }}>{fmtEur(data.totalCaution)}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Occupancy rate</div>
        <div className={styles.statValue} style={{ color: data.occupancyRate >= 80 ? "#22c55e" : "#f59e0b" }}>
          {data.occupancyRate}%
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Vehicles without parking</div>
        <div className={styles.statValue} style={{ color: data.vehiclesWithoutParking > 0 ? "#ef4444" : "#22c55e" }}>
          {data.vehiclesWithoutParking}
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Unused slots</div>
        <div className={styles.statValue} style={{ color: data.unusedCount > 0 ? "#f59e0b" : "#22c55e" }}>
          {data.unusedCount}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type ViewMode = "table" | "map";

export default function ParkingList() {
  const [parkings,   setParkings]   = useState<Parking[]>([]);
  const [analytics,  setAnalytics]  = useState<ParkingAnalytics | null>(null);
  const [cities,     setCities]     = useState<string[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<ParkingStatus | "all">("all");
  const [cityFilter,   setCityFilter]   = useState("");
  const [search,       setSearch]       = useState("");
  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<Parking | null>(null);
  const [detailId,     setDetailId]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (cityFilter) qs.set("city", cityFilter);
      if (search) qs.set("search", search);

      const [pRes, aRes, cRes] = await Promise.all([
        fetch(`/next-api/parkings?${qs}`),
        fetch("/next-api/parkings/analytics"),
        fetch("/next-api/parkings/cities"),
      ]);
      if (pRes.ok) setParkings(await pRes.json());
      if (aRes.ok) setAnalytics(await aRes.json());
      if (cRes.ok) setCities(await cRes.json());
    } finally {
      setLoading(false);
    }
  }, [statusFilter, cityFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (p: Parking) => { setEditTarget(p); setFormOpen(true); };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this parking slot?")) return;
    await fetch(`/next-api/parkings/${id}`, { method: "DELETE" });
    load();
  };

  const handleSaved = () => { setFormOpen(false); load(); };

  const detailParking = parkings.find(p => p.id === detailId) ?? null;

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Parking Management</h1>
          <p className={styles.subtitle}>Rented slots used for vehicle storage and operational logistics</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === "table" ? styles.viewBtnActive : ""}`}
              onClick={() => setView("table")}
            >
              <span className="material-symbols-outlined">table_rows</span> List
            </button>
            <button
              className={`${styles.viewBtn} ${view === "map" ? styles.viewBtnActive : ""}`}
              onClick={() => setView("map")}
            >
              <span className="material-symbols-outlined">map</span> Map
            </button>
          </div>
          <button className={styles.primaryBtn} onClick={openCreate}>
            <span className="material-symbols-outlined">add</span> New parking
          </button>
        </div>
      </div>

      {/* ── Analytics bar ── */}
      {analytics && <AnalyticsBar data={analytics} />}

      {/* ── Unused parking alert ── */}
      {analytics && analytics.unusedParkings.length > 0 && (
        <div className={styles.alertBox}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
          <span>
            {analytics.unusedParkings.length} parking slot{analytics.unusedParkings.length > 1 ? "s" : ""} with no assigned vehicle — idle monthly cost:{" "}
            <strong>{fmtEur(analytics.unusedParkings.reduce((s, p) => s + (p.monthlyRentEur ? Number(p.monthlyRentEur) : 0), 0))}</strong>
          </span>
        </div>
      )}

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          placeholder="Search by name, address, owner…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className={styles.select} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
          <option value="">All cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className={styles.statusFilters}>
          {(["all", "active", "inactive", "maintenance", "blocked"] as const).map(s => (
            <button
              key={s}
              className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : STATUS_LABEL[s as ParkingStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {view === "map" ? (
        <div className={styles.mapWrap}>
          <ParkingMap parkings={parkings} onSelect={id => setDetailId(id)} />
        </div>
      ) : loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : parkings.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#cbd5e1" }}>local_parking</span>
          <p>No parkings found. Import your data from Excel to get started.</p>
          <button className={styles.primaryBtn} onClick={openCreate}>Add your first parking</button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Parking</th>
                <th>City</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Rent/mo</th>
                <th>Deposit</th>
                <th>Vehicles</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {parkings.map(p => (
                <tr key={p.id} className={styles.row} onClick={() => setDetailId(p.id)}>
                  <td>
                    <div className={styles.parkingName}>{p.label}</div>
                    <div className={styles.parkingAddress}>{p.address}</div>
                  </td>
                  <td className={styles.city}>{p.city ?? "—"}</td>
                  <td>
                    {p.parkingType ? (
                      <span className={styles.typeBadge}>{TYPE_LABEL[p.parkingType]}</span>
                    ) : "—"}
                  </td>
                  <td>
                    <div className={styles.ownerName}>{p.ownerName ?? "—"}</div>
                    {p.ownerPhones.length > 0 && (
                      <div className={styles.ownerPhone}>
                        <a
                          href={`tel:${p.ownerPhones[0].phoneNumber}`}
                          onClick={e => e.stopPropagation()}
                          className={styles.phoneLink}
                        >
                          {p.ownerPhones[0].phoneNumber}
                        </a>
                        {p.ownerPhones.length > 1 && (
                          <span className={styles.morePhones}>+{p.ownerPhones.length - 1}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className={styles.rentCell}>{fmtEur(p.monthlyRentEur)}</td>
                  <td className={styles.cautionCell}>{fmtEur(p.cautionEur)}</td>
                  <td>
                    {p.cars && p.cars.length > 0 ? (
                      <span className={styles.occupiedBadge}>{p.cars.length} veh.</span>
                    ) : (
                      <span className={styles.emptyBadge}>Free</span>
                    )}
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
                      <button className={styles.iconBtn} title="Edit" onClick={() => openEdit(p)}>
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button className={styles.iconBtn} title="Delete" onClick={() => handleDelete(p.id)}>
                        <span className="material-symbols-outlined" style={{ color: "#ef4444" }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals / panels ── */}
      {formOpen && (
        <ParkingFormModal
          parking={editTarget}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {detailId && (
        <ParkingDetailPanel
          parkingId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={p => { setDetailId(null); openEdit(p); }}
        />
      )}
    </div>
  );
}
