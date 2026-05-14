"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminSidebar.module.css";

// ── Nav groups ────────────────────────────────────────────────────────────────

interface NavItem {
  href:  string;
  icon:  string;
  label: string;
  badge?: "pendingBookings" | "reminderFailures" | "waitingAdmin";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/admin/fleet",    icon: "directions_car",  label: "Fleet"    },
      { href: "/admin/calendar", icon: "calendar_month",  label: "Calendar" },
      { href: "/admin/bookings", icon: "event_available", label: "Bookings", badge: "pendingBookings" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/invoices",   icon: "receipt_long", label: "Invoices"   },
      { href: "/admin/promotions", icon: "sell",         label: "Promotions" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/users",        icon: "person", label: "Users"        },
      { href: "/admin/contacts",     icon: "mail",   label: "Contacts"     },
      { href: "/admin/guest-access", icon: "key",    label: "Guest Access" },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/admin/support",                 icon: "support_agent",     label: "Support",     badge: "waitingAdmin" },
      { href: "/admin/notifications/reminders", icon: "notifications",     label: "Reminders",   badge: "reminderFailures" },
      { href: "/admin/email-ingestion",         icon: "mark_email_unread", label: "Email Import" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/maintenance", icon: "build",                label: "Maintenance" },
      { href: "/admin/analytics",   icon: "monitoring",           label: "Analytics"   },
      { href: "/admin/admins",      icon: "admin_panel_settings", label: "Admins"      },
      { href: "/admin/content",     icon: "article",              label: "Content"     },
    ],
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  collapsed?:        boolean;
  mobileOpen?:       boolean;
  onToggleCollapse?: () => void;
  onMobileClose?:    () => void;
  pendingBookings?:  number;
  reminderFailures?: number;
  waitingAdmin?:     number;
}

// ── Icon helper ───────────────────────────────────────────────────────────────

function Icon({ name, className }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${styles.icon} ${className ?? ""}`}>{name}</span>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminSidebar({
  collapsed        = false,
  mobileOpen       = false,
  onToggleCollapse,
  onMobileClose,
  pendingBookings  = 0,
  reminderFailures = 0,
  waitingAdmin     = 0,
}: Props) {
  const pathname = usePathname();

  const badgeCount = (key: NavItem["badge"]): number => {
    if (key === "pendingBookings")  return pendingBookings;
    if (key === "reminderFailures") return reminderFailures;
    if (key === "waitingAdmin")     return waitingAdmin;
    return 0;
  };

  const cls = [
    styles.sidebar,
    collapsed  ? styles.sidebarCollapsed  : "",
    mobileOpen ? styles.sidebarMobileOpen : "",
  ].filter(Boolean).join(" ");

  return (
    <aside className={cls}>

      {/* ── Brand + collapse toggle ── */}
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

      {/* ── Nav groups ── */}
      <nav className={styles.nav}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} className={styles.group}>
            <span className={styles.groupLabel}>{group.label}</span>
            {group.items.map(({ href, icon, label, badge }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              const count  = badge ? badgeCount(badge) : 0;
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
                  {count > 0 && (
                    <span className={`${styles.navBadge} ${active ? styles.navBadgeActive : ""}`}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                  {active && <span className={styles.navActiveBar} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer: settings only (logout moved to top bar profile menu) ── */}
      <div className={styles.footer}>
        {(() => {
          const active = pathname.startsWith("/admin/settings");
          return (
            <Link
              href="/admin/settings"
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              title={collapsed ? "Settings" : undefined}
              onClick={onMobileClose}
            >
              <Icon name="settings" className={styles.navIcon} />
              <span className={styles.navLabel}>Settings</span>
              {active && <span className={styles.navActiveBar} />}
            </Link>
          );
        })()}
      </div>

    </aside>
  );
}
