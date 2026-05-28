"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useBusinessTz } from "@/contexts/TzContext";
import { useErrorStore } from "@/lib/errorReporter";
import CommandPalette from "./CommandPalette";
import ErrorsPanel from "@/components/admin/monitoring/ErrorsPanel";
import {
  Search, Clock, AlertTriangle, Bell, AlertCircle,
  Info, ChevronRight, ChevronDown, Settings, LogOut,
} from "lucide-react";
import styles from "./AdminTopBar.module.css";

// ── Breadcrumb ────────────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string | null> = {
  admin:             null,
  fleet:             "Fleet",
  bookings:          "Bookings",
  invoices:          "Invoices",
  analytics:         "Analytics",
  calendar:          "Calendar",
  users:             "Users",
  admins:            "Admins",
  settings:          "Settings",
  maintenance:       "Maintenance",
  promotions:        "Promotions",
  contacts:          "Contacts",
  "guest-access":    "Guest Access",
  content:           "Content",
  "email-ingestion": "Email Import",
  support:           "Support",
  notifications:     null,
  reminders:         "Reminders",
  management:        "Management",
  rent:              "Rent sessions",
  pricing:           "Pricing",
  availability:      "Availability",
  inspections:       "Inspections",
  incidents:         "Incidents",
  odometer:          "Odometer",
  reservations:      "Reservations",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildBreadcrumb(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    if (UUID_RE.test(seg)) continue;
    const label = SEGMENT_LABELS[seg];
    if (label === null) continue;
    if (label !== undefined) crumbs.push({ label, href: path });
  }
  return crumbs;
}

// ── Admin profile ─────────────────────────────────────────────────────────────

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Notification type ─────────────────────────────────────────────────────────

interface NotifItem {
  id: string;
  label: string;
  sub: string;
  href: string;
  urgent: boolean;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  pendingBookings: number;
  reminderFailures: number;
  onMobileMenuOpen: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminTopBar({ pendingBookings, reminderFailures, onMobileMenuOpen }: Props) {
  const pathname  = usePathname();
  const router    = useRouter();
  const tz        = useBusinessTz();
  const crumbs    = buildBreadcrumb(pathname);
  const totalNotifs = pendingBookings + reminderFailures;

  const { errors } = useErrorStore();

  const [paletteOpen,  setPaletteOpen]  = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [errorsOpen,   setErrorsOpen]   = useState(false);
  const [profile,      setProfile]      = useState<AdminProfile | null>(null);
  const [notifItems,   setNotifItems]   = useState<NotifItem[]>([]);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);
  const errorsRef  = useRef<HTMLDivElement>(null);

  // Fetch admin profile once
  useEffect(() => {
    fetch("/next-api/admins/me", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then((data: AdminProfile | null) => { if (data) setProfile(data); })
      .catch(() => {});
  }, []);

  // Build notification items from counts
  useEffect(() => {
    const items: NotifItem[] = [];
    if (pendingBookings > 0) {
      items.push({
        id: "pending-bookings",
        label: `${pendingBookings} booking${pendingBookings !== 1 ? "s" : ""} awaiting confirmation`,
        sub: "Tap to review",
        href: "/admin/bookings",
        urgent: false,
      });
    }
    if (reminderFailures > 0) {
      items.push({
        id: "reminder-failures",
        label: `${reminderFailures} reminder${reminderFailures !== 1 ? "s" : ""} failed recently`,
        sub: "Check reminder logs",
        href: "/admin/notifications/reminders?tab=logs",
        urgent: true,
      });
    }
    setNotifItems(items);
  }, [pendingBookings, reminderFailures]);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
      if (!notifRef.current?.contains(e.target as Node))   setNotifOpen(false);
      if (!errorsRef.current?.contains(e.target as Node))  setErrorsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ⌘K / Ctrl+K to open palette
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleLogout = async () => {
    await fetch("/next-api/auth", { method: "DELETE" });
    router.replace("/login");
  };

  return (
    <>
      <header className={styles.bar}>

        {/* ── Left: mobile hamburger + breadcrumb ── */}
        <div className={styles.left}>
          <button className={styles.hamburger} onClick={onMobileMenuOpen} aria-label="Open menu">
            <span /><span /><span />
          </button>

          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.href} className={styles.breadcrumbItem}>
                {i > 0 && <span className={styles.breadcrumbSep} aria-hidden="true">›</span>}
                {i < crumbs.length - 1 ? (
                  <Link href={c.href} className={styles.breadcrumbLink}>{c.label}</Link>
                ) : (
                  <span className={styles.breadcrumbCurrent}>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* ── Right: search · tz chip · notifs · profile ── */}
        <div className={styles.right}>

          {/* Search */}
          <button className={styles.searchBtn} onClick={() => setPaletteOpen(true)} aria-label="Search (⌘K)">
            <Search size={15} strokeWidth={1.75} className={styles.searchIcon} />
            <span className={styles.searchLabel}>Search</span>
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </button>

          {/* Timezone chip */}
          <Link href="/admin/settings" className={styles.tzChip} title="Timezone settings">
            <Clock size={13} strokeWidth={1.75} className={styles.tzIcon} />
            <span className={styles.tzLabel}>{tz}</span>
          </Link>

          {/* Error indicator */}
          <div ref={errorsRef} className={styles.notifWrap}>
            <button
              className={`${styles.iconBtn} ${errors.length > 0 ? styles.iconBtnError : ""}`}
              onClick={() => setErrorsOpen(o => !o)}
              aria-label={`Client errors${errors.length > 0 ? ` (${errors.length})` : ""}`}
            >
              <AlertTriangle size={18} strokeWidth={1.75} />
              {errors.length > 0 && (
                <span className={`${styles.badge} ${styles.badgeError}`}>{errors.length > 9 ? "9+" : errors.length}</span>
              )}
            </button>
            {errorsOpen && <ErrorsPanel onClose={() => setErrorsOpen(false)} />}
          </div>

          {/* Notifications */}
          <div ref={notifRef} className={styles.notifWrap}>
            <button
              className={`${styles.iconBtn} ${totalNotifs > 0 ? styles.iconBtnAlert : ""}`}
              onClick={() => setNotifOpen(o => !o)}
              aria-label={`Notifications${totalNotifs > 0 ? ` (${totalNotifs})` : ""}`}
            >
              <Bell size={18} strokeWidth={1.75} />
              {totalNotifs > 0 && (
                <span className={styles.badge}>{totalNotifs > 9 ? "9+" : totalNotifs}</span>
              )}
            </button>

            {notifOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>Notifications</div>
                {notifItems.length === 0 ? (
                  <p className={styles.emptyNotif}>All clear — nothing needs attention.</p>
                ) : (
                  <ul className={styles.notifList}>
                    {notifItems.map(item => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className={`${styles.notifItem} ${item.urgent ? styles.notifItemUrgent : ""}`}
                          onClick={() => setNotifOpen(false)}
                        >
                          {item.urgent
                            ? <AlertCircle size={16} strokeWidth={1.75} className={styles.notifItemIcon} />
                            : <Info        size={16} strokeWidth={1.75} className={styles.notifItemIcon} />
                          }
                          <div className={styles.notifItemText}>
                            <span className={styles.notifItemLabel}>{item.label}</span>
                            <span className={styles.notifItemSub}>{item.sub}</span>
                          </div>
                          <ChevronRight size={14} strokeWidth={1.75} className={styles.notifItemArrow} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className={styles.profileWrap}>
            <button
              className={styles.profileBtn}
              onClick={() => setProfileOpen(o => !o)}
              aria-label="Account menu"
            >
              <span className={styles.avatar}>
                {profile ? initials(profile.name) : "…"}
              </span>
              <span className={styles.profileName}>{profile?.name ?? ""}</span>
              <ChevronDown size={14} strokeWidth={1.75} className={styles.chevron} />
            </button>

            {profileOpen && (
              <div className={styles.dropdown}>
                {profile && (
                  <div className={styles.profileCard}>
                    <span className={`${styles.avatar} ${styles.avatarLg}`}>{initials(profile.name)}</span>
                    <div>
                      <p className={styles.profileCardName}>{profile.name}</p>
                      <p className={styles.profileCardEmail}>{profile.email}</p>
                      {profile.role && (
                        <span className={styles.roleBadge}>{profile.role}</span>
                      )}
                    </div>
                  </div>
                )}
                <div className={styles.dropdownDivider} />
                <Link href="/admin/settings" className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                  <Settings size={15} strokeWidth={1.75} />
                  Settings
                </Link>
                <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                  <LogOut size={15} strokeWidth={1.75} />
                  Sign out
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
