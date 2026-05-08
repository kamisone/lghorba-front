"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AdminSidebar.module.css";

const NAV = [
  { href: "/admin/fleet",             icon: "directions_car",      label: "Fleet"     },
  { href: "/admin/bookings",          icon: "event_available",     label: "Bookings"  },
  { href: "/admin/invoices",          icon: "receipt_long",        label: "Invoices"  },
  { href: "/admin/email-ingestion",   icon: "mark_email_unread",   label: "Email Import" },
  { href: "/admin/maintenance",       icon: "build",               label: "Maintenance" },
  { href: "/admin/calendar",           icon: "calendar_month",      label: "Calendar"  },
  { href: "/admin/users",             icon: "person",              label: "Users"     },
  { href: "/admin/admins",            icon: "admin_panel_settings", label: "Admins"   },
  { href: "/admin/contacts",          icon: "mail",                label: "Contacts"  },
  { href: "/admin/guest-access",      icon: "key",                 label: "Guest Access" },
  { href: "/admin/content",           icon: "article",             label: "Content"      },
];

interface Props {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggleCollapse?: () => void;
  onMobileClose?: () => void;
}

function Icon({ name, className }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${styles.icon} ${className ?? ""}`}>{name}</span>;
}

export default function AdminSidebar({
  collapsed = false,
  mobileOpen = false,
  onToggleCollapse,
  onMobileClose,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/next-api/auth", { method: "DELETE" });
    router.replace("/login");
  };

  const cls = [
    styles.sidebar,
    collapsed  ? styles.sidebarCollapsed  : "",
    mobileOpen ? styles.sidebarMobileOpen : "",
  ].filter(Boolean).join(" ");

  return (
    <aside className={cls}>

      {/* ── Brand + desktop collapse toggle ── */}
      <div className={styles.brand}>
        <div className={styles.brandText}>
          <p className={styles.brandName}>vitecamion</p>
          <p className={styles.brandSub}>Administration</p>
        </div>
        <button
          className={styles.collapseBtn}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <Icon name={collapsed ? "chevron_right" : "chevron_left"} />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className={styles.nav}>
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              title={collapsed ? label : undefined}
              onClick={onMobileClose}
            >
              <Icon name={icon} className={styles.navIcon} />
              <span className={styles.navLabel}>{label}</span>
              {active && <span className={styles.navActiveBar} />}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className={styles.footer}>
        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
        >
          <Icon name="logout" className={styles.logoutIcon} />
          <span className={styles.logoutLabel}>Sign out</span>
        </button>
      </div>

      {/* Mobile close button */}
      <button className={styles.mobileCloseBtn} onClick={onMobileClose} aria-label="Close menu">
        <Icon name="close" />
      </button>

    </aside>
  );
}
