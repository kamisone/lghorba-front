"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import styles from "./AdminShell.module.css";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleToggle = () => {
    if (isMobile) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  // On mobile: collapsed=false when open (shows chevron_left), collapsed=true when closed
  const effectiveCollapsed = isMobile ? !mobileOpen : collapsed;

  return (
    <div className={`${styles.shell} ${effectiveCollapsed ? styles.collapsed : ""}`}>
      {/* Floating hamburger — mobile only, shown when sidebar is closed */}
      {isMobile && !mobileOpen && (
        <button
          className={styles.mobileHamburger}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>
      )}

      <AdminSidebar
        collapsed={effectiveCollapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={handleToggle}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
