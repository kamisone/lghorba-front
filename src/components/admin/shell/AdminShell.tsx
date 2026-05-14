"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { io } from "socket.io-client";
import { api } from "@/lib/api";
import { WS_HOST, WS_PATH } from "@/lib/wsConfig";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import styles from "./AdminShell.module.css";

// ── Badge-count fetching ──────────────────────────────────────────────────────

interface Counts {
  pendingBookings:  number;
  reminderFailures: number;
  waitingAdmin:     number;
}

async function fetchCounts(): Promise<Omit<Counts, "waitingAdmin">> {
  const [bookingsResult, remindersResult] = await Promise.allSettled([
    api.admin.bookings.list(),
    api.admin.reminders.failedLogs(),
  ]);

  const pendingBookings = bookingsResult.status === "fulfilled"
    ? bookingsResult.value.filter(b => b.status === "pending").length
    : 0;

  const remindersData = remindersResult.status === "fulfilled" ? remindersResult.value : {};
  const reminderFailures = remindersData.total ?? remindersData.items?.length ?? 0;

  return { pendingBookings, reminderFailures };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);
  const [counts,     setCounts]     = useState<Counts>({ pendingBookings: 0, reminderFailures: 0, waitingAdmin: 0 });
  const pathname    = usePathname();
  // Tracks unreadAdminCount per conversation so we can handle transitions accurately
  const convUnreadRef = useRef(new Map<string, number>());

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    fetchCounts().then(c => setCounts(prev => ({ ...prev, ...c }))).catch(() => {});
  }, []);

  // ── Support WS: realtime waiting badge ──────────────────────────────────────
  useEffect(() => {
    let socket: ReturnType<typeof io> | null = null;
    let cancelled = false;

    fetch("/next-api/support/ws-ticket")
      .then(r => r.ok ? r.json() : null)
      .then((data: { token: string } | null) => {
        if (cancelled || !data?.token) return;

        socket = io(`${WS_HOST}/support`, {
          auth:       { adminToken: data.token },
          transports: ["websocket", "polling"],
          path:       WS_PATH,
        });

        socket.on("connected", ({ unreadConvsCount }: { unreadConvsCount: number }) => {
          setCounts(prev => ({ ...prev, waitingAdmin: unreadConvsCount }));
        });

        socket.on("conversation:new", (conv: { id: string; unreadAdminCount?: number }) => {
          const n = conv.unreadAdminCount ?? 1;
          convUnreadRef.current.set(conv.id, n);
          setCounts(prev => ({ ...prev, waitingAdmin: prev.waitingAdmin + 1 }));
        });

        socket.on("conversation:update", (upd: { id: string; unreadAdminCount?: number }) => {
          if (upd.unreadAdminCount === undefined) return;
          const prev    = convUnreadRef.current.get(upd.id) ?? 0;
          const hadUnread = prev > 0;
          const hasUnread = upd.unreadAdminCount > 0;
          convUnreadRef.current.set(upd.id, upd.unreadAdminCount);
          if (!hadUnread && hasUnread) {
            setCounts(c => ({ ...c, waitingAdmin: c.waitingAdmin + 1 }));
          } else if (hadUnread && !hasUnread) {
            setCounts(c => ({ ...c, waitingAdmin: Math.max(0, c.waitingAdmin - 1) }));
          }
        });
      })
      .catch(() => {});

    return () => { cancelled = true; socket?.disconnect(); };
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
        waitingAdmin={counts.waitingAdmin}
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
