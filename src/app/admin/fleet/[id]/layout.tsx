"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import CarFormModal from "@/components/admin/fleet/CarFormModal";
import type { Car } from "@/components/admin/fleet/data";
import styles from "@/components/admin/fleet/VehicleWorkspace.module.css";
import { useToast } from "@/components/toast/ToastContext";
import { useModalUrl } from "@/hooks/useModalUrl";
import { Car as CarIcon, AlertTriangle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type HealthStatus = "healthy" | "warning" | "critical" | "unsafe" | "needs_service";

interface HealthRecord {
  status: HealthStatus;
  reason: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<HealthStatus, string> = {
  healthy:      "#22c55e",
  warning:      "#f59e0b",
  critical:     "#ef4444",
  unsafe:       "#7c3aed",
  needs_service:"#f97316",
};
const HEALTH_LABEL: Record<HealthStatus, string> = {
  healthy:      "Healthy",
  warning:      "Warning",
  critical:     "Critical",
  unsafe:       "Unsafe",
  needs_service:"Needs Service",
};

const TABS: { segment: string; label: string; icon: React.ReactNode }[] = [
  { segment: "management",  label: "Management",  icon: "⚙" },
  { segment: "rent",        label: "Rent",        icon: "📅" },
  { segment: "maintenance", label: "Maintenance", icon: "🔧" },
  { segment: "inspections", label: "Inspections", icon: "🔍" },
  { segment: "incidents",   label: "Incidents",   icon: <AlertTriangle size={16} strokeWidth={1.75} /> },
  { segment: "faq",         label: "FAQ",         icon: "❓" },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export default function VehicleWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { id }   = useParams<{ id: string }>();
  const pathname = usePathname();
  const router   = useRouter();
  const { toast }        = useToast();
  const { openModal, closeModal } = useModalUrl();

  const [car,         setCar]         = useState<Car | null>(null);
  const [health,      setHealth]      = useState<HealthRecord | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [showEdit,    setShowEdit]    = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [imgError,    setImgError]    = useState(false);

  // Open edit modal from URL param (so management page can deep-link)
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("modal") === "car-edit") setShowEdit(true);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/next-api/cars/${id}`, { cache: "no-store" }).then(r => r.ok ? r.json() : null),
      fetch(`/next-api/vehicle-health/${id}`, { cache: "no-store" }).then(r => r.ok ? r.json() : null),
    ]).then(([carData, healthData]) => {
      setCar(carData);
      setHealth(healthData);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!car) return;
    setDeleting(true);
    try {
      await fetch(`/next-api/cars/${car.id}`, { method: "DELETE" });
      toast.success("Vehicle deleted");
      router.replace("/admin/fleet");
    } catch {
      toast.error("Failed to delete vehicle");
      setDeleting(false);
      setConfirmDel(false);
    }
  };

  // Determine active tab from pathname
  const activeSegment = TABS.find(t => pathname.includes(`/${t.segment}`))?.segment ?? null;

  // Vehicle identity display values
  const title = car
    ? ([car.brand, car.model, car.finishing].filter(Boolean).join(" ") || car.name)
    : null;

  const healthStatus: HealthStatus = health?.status ?? "healthy";
  const hColor = HEALTH_COLOR[healthStatus];

  return (
    <div className={styles.workspace}>

      {/* ── Sticky header ── */}
      <header className={styles.header}>

        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link href="/admin/fleet" className={styles.breadcrumbLink}>Fleet</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>
            {loading ? "…" : (title ?? car?.name ?? id)}
          </span>
        </div>

        {/* Vehicle identity strip */}
        <div className={styles.identity}>

          {/* Photo */}
          {loading ? (
            <div className={styles.skeletonPhoto} />
          ) : car?.photo && !imgError ? (
            <img
              src={`/next-api/cars/${id}/photo`}
              alt={car.name}
              className={styles.vehiclePhoto}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={styles.vehiclePhotoPlaceholder}><CarIcon size={16} strokeWidth={1.75} /></div>
          )}

          {/* Name + meta */}
          <div className={styles.vehicleInfo}>
            {loading ? (
              <>
                <div className={styles.skeletonLine} style={{ width: 180, marginBottom: 8 }} />
                <div className={styles.skeletonLine} style={{ width: 120 }} />
              </>
            ) : (
              <>
                <h1 className={styles.vehicleName}>{title ?? car?.name}</h1>
                <div className={styles.vehicleMeta}>
                  {car?.immatriculation && (
                    <span className={styles.plate}>{car.immatriculation}</span>
                  )}
                  {car?.phoneNumber && (
                    <span className={styles.phone}>{car.phoneNumber}</span>
                  )}
                  {/* Badges */}
                  <div className={styles.badges}>
                    <span
                      className={styles.badge}
                      style={{ background: `${hColor}18`, color: hColor }}
                    >
                      <span className={styles.badgeDot} style={{ background: hColor }} />
                      {HEALTH_LABEL[healthStatus]}
                    </span>
                    {car?.isCurrentlyRented && (
                      <span className={styles.badge} style={{ background: "#fef2f2", color: "#dc2626" }}>
                        <span className={styles.badgeDot} style={{ background: "#dc2626" }} />
                        Rented
                      </span>
                    )}
                    {car?.isTrackingActive && (
                      <span className={styles.badge} style={{ background: "#f0fdf4", color: "#16a34a" }}>
                        <span className={styles.badgeDot} style={{ background: "#22c55e" }} />
                        GPS Active
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Header actions */}
          {!loading && car && (
            <div className={styles.headerActions}>
              <button
                className={styles.editBtn}
                onClick={() => { setShowEdit(true); openModal("car-edit"); }}
              >
                Edit vehicle
              </button>
              {confirmDel ? (
                <button
                  className={styles.deleteBtn}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Confirm?"}
                </button>
              ) : (
                <button
                  className={styles.deleteBtn}
                  onClick={() => setConfirmDel(true)}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <nav className={styles.tabs} aria-label="Vehicle sections">
          {TABS.map(tab => {
            const href    = `/admin/fleet/${id}/${tab.segment}`;
            const isActive = activeSegment === tab.segment;
            return (
              <Link
                key={tab.segment}
                href={href}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ── Page content ── */}
      <main className={styles.content}>
        {children}
      </main>

      {/* ── Edit modal ── */}
      {showEdit && car && (
        <CarFormModal
          car={car}
          onClose={() => { setShowEdit(false); closeModal(); }}
          onSaved={(updated) => { setCar(updated); setShowEdit(false); closeModal(); }}
        />
      )}
    </div>
  );
}
