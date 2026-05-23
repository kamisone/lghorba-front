"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminSidebar.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  href?:   string;
  icon:    string;
  label:   string;
  badge?:  "pendingBookings" | "reminderFailures" | "waitingAdmin";
  future?: boolean;
}

interface NavSubGroup {
  label: string;
  icon:  string;
  items: NavItem[];
}

interface NavGroup {
  label:      string;
  items?:     NavItem[];
  subGroups?: NavSubGroup[];
}

// ── Nav data ──────────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/admin/fleet",     icon: "directions_car",  label: "Fleet"    },
      { href: "/admin/calendar",  icon: "calendar_month",  label: "Calendar" },
      { href: "/admin/bookings",  icon: "event_available", label: "Bookings", badge: "pendingBookings" },
      { href: "/admin/parkings",  icon: "local_parking",   label: "Parkings" },
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
      { href: "/admin/support",                 icon: "support_agent",     label: "Support",     badge: "waitingAdmin"     },
      { href: "/admin/notifications/reminders", icon: "notifications",     label: "Reminders",   badge: "reminderFailures" },
      { href: "/admin/email-ingestion",         icon: "mark_email_unread", label: "Email Import" },
    ],
  },
  {
    label: "Trip Insights",
    items: [
      { href: "/admin/insights/destinations", icon: "location_on", label: "Destinations" },
    ],
  },
  {
    label: "Commerce",
    subGroups: [
      {
        label: "Catalog",
        icon:  "category",
        items: [
          { href: "/admin/shop/products",           icon: "inventory_2",  label: "Products"               },
          { href: "/admin/shop/categories",         icon: "folder_open",  label: "Categories"             },
          { href: "/admin/shop/collections",        icon: "collections",  label: "Collections"            },
          { href: "/admin/shop/variant-attributes", icon: "tune",         label: "Variations & Attributes" },
          { href: "/admin/shop/inventory",          icon: "warehouse",    label: "Inventory"              },
          { href: "/admin/shop/reviews",            icon: "star",         label: "Product Reviews"        },
          { href: "/admin/shop/media",              icon: "photo_library", label: "Media Library"         },
        ],
      },
      {
        label: "Orders",
        icon:  "shopping_bag",
        items: [
          { href: "/admin/shop/orders",             icon: "shopping_bag",      label: "All Orders"       },
          { href: "/admin/shop/orders/drafts",      icon: "draft",             label: "Draft Orders"     },
          { href: "/admin/shop/returns",            icon: "assignment_return", label: "Returns & Refunds" },
          { href: "/admin/shop/order-status-refs",  icon: "timeline",          label: "Order Statuses"   },
          { href: "/admin/shop/carts",              icon: "shopping_cart",     label: "Abandoned Carts"  },
        ],
      },
      {
        label: "Customers",
        icon:  "group",
        items: [
          { href: "/admin/shop/customers",            icon: "person",              label: "Customers"             },
          { href: "/admin/shop/customers/groups",     icon: "group",               label: "Customer Groups"       },
          { href: "/admin/shop/customers/addresses",  icon: "location_on",         label: "Addresses"             },
          { href: "/admin/shop/payment-methods",      icon: "account_balance_wallet", label: "Saved Payment Methods" },
          { href: "/admin/shop/customers/activity",   icon: "history",             label: "Customer Activity"     },
        ],
      },
      {
        label: "Promotions",
        icon:  "sell",
        items: [
          { href: "/admin/shop/promotions",           icon: "percent",             label: "Promotions"        },
          { href: "/admin/shop/coupons",              icon: "confirmation_number", label: "Coupons"           },
          { href: "/admin/shop/analytics/promotions", icon: "bar_chart",           label: "Discount Analytics" },
        ],
      },
      {
        label: "Shipping",
        icon:  "local_shipping",
        items: [
          { href: "/admin/shop/shipping",                    icon: "local_shipping", label: "Shipping Config"      },
          { href: "/admin/shop/shipping/delivery-rules",     icon: "rule",           label: "Delivery Rules"       },
          { href: "/admin/shop/fulfillment",                 icon: "package_2",      label: "Fulfillment Tracking" },
        ],
      },
      {
        label: "Payments",
        icon:  "payments",
        items: [
          { href: "/admin/shop/transactions",                icon: "receipt",         label: "Transactions"     },
          { href: "/admin/shop/payment-types",               icon: "credit_card",     label: "Payment Types"    },
          { href: "/admin/shop/transactions/refunds",        icon: "currency_exchange", label: "Refunds"        },
          { href: "/admin/shop/transactions/stripe-events",  icon: "bolt",            label: "Stripe Events"    },
          { href: "/admin/shop/transactions/failures",       icon: "error",           label: "Payment Failures" },
        ],
      },
      {
        label: "Analytics",
        icon:  "insights",
        items: [
          { href: "/admin/shop/analytics/revenue",     icon: "trending_up",  label: "Revenue Analytics"   },
          { href: "/admin/shop/analytics/products",    icon: "auto_graph",   label: "Product Performance" },
          { href: "/admin/shop/analytics/conversion",  icon: "conversion",   label: "Conversion Metrics"  },
          { href: "/admin/shop/analytics/customers",   icon: "group",        label: "Customer Insights"   },
          { href: "/admin/shop/analytics/promotions",  icon: "percent",      label: "Promotion Performance" },
          { href: "/admin/shop/analytics/inventory",   icon: "warehouse",    label: "Inventory Analytics" },
        ],
      },
      {
        label: "Content & Merchandising",
        icon:  "web_stories",
        items: [
          { href: "/admin/blog",                         icon: "edit_note",     label: "Blog Posts"              },
          { href: "/admin/shop/collections/seo",         icon: "search",        label: "SEO Landing Pages"       },
          { href: "/admin/shop/collections/featured",    icon: "star",          label: "Featured Collections"    },
          { href: "/admin/shop/merchandising",           icon: "storefront",    label: "Homepage Merchandising"  },
          { href: "/admin/shop/recommendations",         icon: "recommend",     label: "Product Recommendations" },
        ],
      },
      {
        label: "Marketplace",
        icon:  "store",
        items: [
          { href: "/admin/shop/vendors",             icon: "store",    label: "Vendors"            },
          { href: "/admin/shop/payouts",             icon: "payments", label: "Vendor Payouts"     },
          { href: "/admin/shop/vendors/products",    icon: "inventory_2", label: "Vendor Products" },
          { href: "/admin/shop/vendors/performance", icon: "leaderboard", label: "Vendor Performance" },
        ],
      },
      {
        label: "Settings",
        icon:  "settings",
        items: [
          { href: "/admin/shop/countries",           icon: "flag",         label: "Countries"              },
          { href: "/admin/shop/settings/taxes",      icon: "receipt_long", label: "Taxes & VAT"            },
          { href: "/admin/shop/settings/currency",   icon: "currency_exchange", label: "Currency Settings" },
          { href: "/admin/shop/settings/config",     icon: "tune",         label: "Commerce Configuration" },
          { href: "/admin/shop/settings/notifications", icon: "mail",      label: "Notification Templates" },
          { href: "/admin/shop/settings/checkout",   icon: "shopping_cart_checkout", label: "Checkout Settings" },
        ],
      },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/blog",            icon: "edit_note",   label: "Articles"   },
      { href: "/admin/blog/categories", icon: "label",       label: "Categories" },
      { href: "/admin/blog/tags",       icon: "tag",         label: "Tags"       },
      { href: "/admin/content",         icon: "web_stories", label: "Policies"   },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/maintenance", icon: "build",                label: "Maintenance" },
      { href: "/admin/analytics",   icon: "monitoring",           label: "Analytics"   },
      { href: "/admin/admins",      icon: "admin_panel_settings", label: "Admins"      },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  function renderItem(item: NavItem) {
    if (item.future) {
      return (
        <div key={item.label} className={styles.futureItem} title={collapsed ? item.label : undefined}>
          <Icon name={item.icon} className={styles.navIcon} />
          <span className={styles.navLabel}>{item.label}</span>
          <span className={styles.futureBadge}>soon</span>
        </div>
      );
    }

    const href   = item.href!;
    const active = pathname === href || pathname.startsWith(href + "/");
    const count  = item.badge ? badgeCount(item.badge) : 0;
    return (
      <Link
        key={href}
        href={href}
        className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
        title={collapsed ? item.label : undefined}
        onClick={onMobileClose}
      >
        <Icon name={item.icon} className={styles.navIcon} />
        <span className={styles.navLabel}>{item.label}</span>
        {count > 0 && (
          <span className={`${styles.navBadge} ${active ? styles.navBadgeActive : ""}`}>
            {count > 99 ? "99+" : count}
          </span>
        )}
        {active && <span className={styles.navActiveBar} />}
      </Link>
    );
  }

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

            {group.subGroups ? (
              group.subGroups.map(subGroup => (
                <div key={subGroup.label} className={styles.subGroup}>
                  <div className={styles.subGroupHeader}>
                    <Icon name={subGroup.icon} className={styles.subGroupIcon} />
                    <span className={styles.subGroupLabel}>{subGroup.label}</span>
                  </div>
                  {subGroup.items.map(item => renderItem(item))}
                </div>
              ))
            ) : (
              group.items!.map(item => renderItem(item))
            )}
          </div>
        ))}
      </nav>

      {/* ── Footer: settings ── */}
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
