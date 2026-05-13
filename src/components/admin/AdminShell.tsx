"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import styles from "./AdminShell.module.css";

// ── Badge-count fetching ──────────────────────────────────────────────────────

interface Counts {
  pendingBookings:  number;
  reminderFailures: number;
}

async function fetchCounts(): Promise<Counts> {
  const [bookingsRes, remindersRes] = await Promise.allSettled([
    fetch("/next-api/bookings",                               { cache: "no-store" }),
    fetch("/next-api/notifications/reminders/logs?status=failed&limit=50", { cache: "no-store" }),
  ]);

  let pendingBookings  = 0;
  let reminderFailures = 0;

  if (bookingsRes.status === "fulfilled" && bookingsRes.value.ok) {
    const data: Array<{ status: string }> = await bookingsRes.value.json().catch(() => []);
    pendingBookings = data.filter(b => b.status === "pending").length;
  }

  if (remindersRes.status === "fulfilled" && remindersRes.value.ok) {
    const data: { total?: number; items?: unknown[] } = await remindersRes.value.json().catch(() => ({}));
    reminderFailures = data.total ?? data.items?.length ?? 0;
  }

  return { pendingBookings, reminderFailures };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);
  const [counts,     setCounts]     = useState<Counts>({ pendingBookings: 0, reminderFailures: 0 });
  const pathname = usePathname();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    fetchCounts().then(setCounts).catch(() => {});
  }, []);

  const handleToggle = useCallback(() => {
    if (isMobile) setMobileOpen(o => !o);
    else setCollapsed(c => !c);
  }, [isMobile]);

  const effectiveCollapsed = isMobile ? !mobileOpen : collapsed;

  return (
    <div className={`${styles.shell} ${effectiveCollapsed ? styles.collapsed : ""}`}>

      {isMobile && mobileOpen && (
        <div className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <AdminSidebar
        collapsed={effectiveCollapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={handleToggle}
        onMobileClose={() => setMobileOpen(false)}
        pendingBookings={counts.pendingBookings}
        reminderFailures={counts.reminderFailures}
      />

      <div className={styles.main}>
        <AdminTopBar
          pendingBookings={counts.pendingBookings}
          reminderFailures={counts.reminderFailures}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />
        <div className={styles.content}>
          {children}
        </div>
      </div>

    </div>
  );
}
