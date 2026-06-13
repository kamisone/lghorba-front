"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Car, CalendarDays, CalendarCheck, ParkingCircle,
  Receipt, Tag, User, Mail, Key, Send,
  Headphones, Bell, MailOpen,
  MapPin, Layers, Package, FolderOpen, LayoutGrid,
  SlidersHorizontal, Warehouse, Star, Images,
  ShoppingBag, FileText, Undo2, GitBranch, ShoppingCart,
  Users, Wallet, History, Percent, Ticket, BarChart3,
  Truck, ClipboardCheck, Box, CreditCard, ArrowLeftRight,
  Zap, AlertCircle, TrendingUp, LineChart, BarChart2,
  BookOpen, Search, Store, ThumbsUp, Trophy,
  Flag, FileEdit, Hash, Wrench, Activity, ShieldCheck,
  Settings, ChevronRight, ChevronLeft, ChevronDown,
} from "lucide-react";
import styles from "./AdminSidebar.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  href?:   string;
  icon:    LucideIcon;
  label:   string;
  badge?:  "pendingBookings" | "reminderFailures" | "waitingAdmin";
  future?: boolean;
}

interface NavCategory {
  label: string;
  icon:  LucideIcon;
  items: NavItem[];
}

interface NavGroup {
  label:       string;
  items?:      NavItem[];
  categories?: NavCategory[];
}

// ── Nav data ──────────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/admin/fleet",     icon: Car,           label: "Fleet"    },
      { href: "/admin/calendar",  icon: CalendarDays,  label: "Calendar" },
      { href: "/admin/bookings",  icon: CalendarCheck, label: "Bookings", badge: "pendingBookings" },
      { href: "/admin/parkings",  icon: ParkingCircle, label: "Parkings" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/invoices",   icon: Receipt, label: "Invoices"   },
      { href: "/admin/promotions", icon: Tag,     label: "Promotions" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/users",        icon: User, label: "Users"        },
      { href: "/admin/contacts",     icon: Mail, label: "Contacts"     },
      { href: "/admin/guest-access", icon: Key,  label: "Guest Access" },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/admin/support",                 icon: Headphones, label: "Support",     badge: "waitingAdmin"     },
      { href: "/admin/notifications/reminders", icon: Bell,       label: "Reminders",   badge: "reminderFailures" },
      { href: "/admin/email-ingestion",         icon: MailOpen,   label: "Email Import" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/marketing/newsletters", icon: Mail,      label: "Newsletters"     },
      { href: "/admin/marketing/campaigns",   icon: Send,      label: "Campaigns"       },
      { href: "/admin/marketing/subscribers", icon: Users,     label: "Subscribers"     },
      { href: "/admin/marketing/analytics",   icon: BarChart3, label: "Email Analytics" },
    ],
  },
  {
    label: "Trip Insights",
    items: [
      { href: "/admin/insights/destinations", icon: MapPin, label: "Destinations" },
    ],
  },
  {
    label: "Commerce",
    categories: [
      {
        label: "Catalog",
        icon:  Layers,
        items: [
          { href: "/admin/shop/products",           icon: Package,           label: "Products"                },
          { href: "/admin/shop/categories",         icon: FolderOpen,        label: "Categories"              },
          { href: "/admin/shop/collections",        icon: LayoutGrid,        label: "Collections"             },
          { href: "/admin/shop/variant-attributes", icon: SlidersHorizontal, label: "Variations & Attributes" },
          { href: "/admin/shop/inventory",          icon: Warehouse,         label: "Inventory"               },
          { href: "/admin/shop/reviews",            icon: Star,              label: "Product Reviews"         },
          { href: "/admin/shop/media",              icon: Images,            label: "Media Library"           },
        ],
      },
      {
        label: "Orders",
        icon:  ShoppingBag,
        items: [
          { href: "/admin/shop/orders",            icon: ShoppingBag,  label: "All Orders"        },
          { href: "/admin/shop/orders/drafts",     icon: FileText,     label: "Draft Orders"      },
          { href: "/admin/shop/returns",           icon: Undo2,        label: "Returns & Refunds" },
          { href: "/admin/shop/order-status-refs", icon: GitBranch,    label: "Order Statuses"    },
          { href: "/admin/shop/carts",             icon: ShoppingCart, label: "Abandoned Carts"   },
        ],
      },
      {
        label: "Customers",
        icon:  Users,
        items: [
          { href: "/admin/shop/customers",           icon: User,    label: "Customers"             },
          { href: "/admin/shop/customers/groups",    icon: Users,   label: "Customer Groups"       },
          { href: "/admin/shop/customers/addresses", icon: MapPin,  label: "Addresses"             },
          { href: "/admin/shop/payment-methods",     icon: Wallet,  label: "Saved Payment Methods" },
          { href: "/admin/shop/customers/activity",  icon: History, label: "Customer Activity"     },
        ],
      },
      {
        label: "Promotions",
        icon:  Tag,
        items: [
          { href: "/admin/shop/promotions",           icon: Percent,   label: "Promotions"         },
          { href: "/admin/shop/coupons",              icon: Ticket,    label: "Coupons"            },
          { href: "/admin/shop/analytics/promotions", icon: BarChart3, label: "Discount Analytics" },
        ],
      },
      {
        label: "Shipping",
        icon:  Truck,
        items: [
          { href: "/admin/shop/shipping",                icon: Truck,          label: "Shipping Config"      },
          { href: "/admin/shop/shipping/delivery-rules", icon: ClipboardCheck, label: "Delivery Rules"       },
          { href: "/admin/shop/fulfillment",             icon: Box,            label: "Fulfillment Tracking" },
        ],
      },
      {
        label: "Payments",
        icon:  CreditCard,
        items: [
          { href: "/admin/shop/transactions",               icon: Receipt,        label: "Transactions"     },
          { href: "/admin/shop/payment-types",              icon: CreditCard,     label: "Payment Types"    },
          { href: "/admin/shop/transactions/refunds",       icon: ArrowLeftRight, label: "Refunds"          },
          { href: "/admin/shop/transactions/stripe-events", icon: Zap,            label: "Stripe Events"    },
          { href: "/admin/shop/transactions/failures",      icon: AlertCircle,    label: "Payment Failures" },
        ],
      },
      {
        label: "Analytics",
        icon:  BarChart2,
        items: [
          { href: "/admin/shop/analytics/revenue",    icon: TrendingUp, label: "Revenue Analytics"    },
          { href: "/admin/shop/analytics/products",   icon: LineChart,  label: "Product Performance"  },
          { href: "/admin/shop/analytics/conversion", icon: BarChart3,  label: "Conversion Metrics"   },
          { href: "/admin/shop/analytics/customers",  icon: Users,      label: "Customer Insights"    },
          { href: "/admin/shop/analytics/promotions", icon: Percent,    label: "Promotion Performance" },
          { href: "/admin/shop/analytics/inventory",  icon: Warehouse,  label: "Inventory Analytics"  },
        ],
      },
      {
        label: "Content & Merchandising",
        icon:  BookOpen,
        items: [
          { href: "/admin/blog",                      icon: FileEdit, label: "Blog Posts"              },
          { href: "/admin/shop/collections/seo",      icon: Search,   label: "SEO Landing Pages"       },
          { href: "/admin/shop/collections/featured", icon: Star,     label: "Featured Collections"    },
          { href: "/admin/shop/merchandising",        icon: Store,    label: "Homepage Merchandising"  },
          { href: "/admin/shop/recommendations",      icon: ThumbsUp, label: "Product Recommendations" },
        ],
      },
      {
        label: "Marketplace",
        icon:  Store,
        items: [
          { href: "/admin/shop/vendors",             icon: Store,      label: "Vendors"            },
          { href: "/admin/shop/payouts",             icon: CreditCard, label: "Vendor Payouts"     },
          { href: "/admin/shop/vendors/products",    icon: Package,    label: "Vendor Products"    },
          { href: "/admin/shop/vendors/performance", icon: Trophy,     label: "Vendor Performance" },
        ],
      },
      {
        label: "Settings",
        icon:  Settings,
        items: [
          { href: "/admin/shop/countries",              icon: Flag,              label: "Countries"                },
          { href: "/admin/shop/settings/taxes",         icon: Receipt,           label: "Taxes & VAT"              },
          { href: "/admin/shop/settings/currency",      icon: ArrowLeftRight,    label: "Currency Settings"        },
          { href: "/admin/shop/settings/config",        icon: SlidersHorizontal, label: "Commerce Configuration"   },
          { href: "/admin/shop/settings/notifications", icon: Mail,              label: "Notification Templates"   },
          { href: "/admin/shop/settings/checkout",      icon: ShoppingCart,      label: "Checkout Settings"        },
        ],
      },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/blog",            icon: FileEdit, label: "Articles"   },
      { href: "/admin/blog/categories", icon: Tag,      label: "Categories" },
      { href: "/admin/blog/tags",       icon: Hash,     label: "Tags"       },
      { href: "/admin/content",         icon: BookOpen, label: "Policies"   },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/maintenance", icon: Wrench,      label: "Maintenance" },
      { href: "/admin/analytics",   icon: Activity,    label: "Analytics"   },
      { href: "/admin/admins",      icon: ShieldCheck, label: "Admins"      },
    ],
  },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES_KEY = "admin-sidebar-open-categories";

// ── Helpers ───────────────────────────────────────────────────────────────────

function categoryHasActive(category: NavCategory, activeHref: string | null): boolean {
  if (!activeHref) return false;
  return category.items.some(item => item.href === activeHref);
}

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

// ── Icon renderer ─────────────────────────────────────────────────────────────

function Icon({ icon: I, className }: { icon: LucideIcon; className?: string }) {
  return <I size={16} strokeWidth={1.75} className={className} />;
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

  // Longest href among all nav items that matches the current pathname.
  // Prevents shorter hrefs (e.g. /admin/blog) from activating when a more
  // specific sibling route (e.g. /admin/blog/categories) is the real match.
  const activeHref = useMemo(() => {
    const allHrefs: string[] = ["/admin/settings"];
    for (const group of NAV_GROUPS) {
      (group.items ?? []).forEach(item => { if (item.href) allHrefs.push(item.href); });
      (group.categories ?? []).forEach(cat =>
        cat.items.forEach(item => { if (item.href) allHrefs.push(item.href); })
      );
    }
    const matches = allHrefs.filter(
      href => pathname === href || pathname.startsWith(href + "/")
    );
    if (!matches.length) return null;
    return matches.reduce((a, b) => (a.length >= b.length ? a : b));
  }, [pathname]);

  // ── Category open state ──────────────────────────────────────────────────

  const [userOpenedCategories, setUserOpenedCategories] = useState<Set<string>>(new Set());
  const skipPersist    = useRef(true);
  const skipRouteReset = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CATEGORIES_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setUserOpenedCategories(new Set<string>(arr));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (skipPersist.current) { skipPersist.current = false; return; }
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(Array.from(userOpenedCategories)));
    } catch {}
  }, [userOpenedCategories]);

  useEffect(() => {
    if (skipRouteReset.current) { skipRouteReset.current = false; return; }
    setUserOpenedCategories(new Set());
  }, [pathname]);

  const toggleCategory = useCallback((label: string, isRouteActive: boolean) => {
    if (isRouteActive) return;
    setUserOpenedCategories(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

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

  // ── Render item (Level 3) ────────────────────────────────────────────────

  function renderItem(item: NavItem) {
    if (item.future) {
      return (
        <div key={item.label} className={styles.futureItem} title={collapsed ? item.label : undefined}>
          <Icon icon={item.icon} className={styles.navIcon} />
          <span className={styles.navLabel}>{item.label}</span>
          <span className={styles.futureBadge}>soon</span>
        </div>
      );
    }

    const href   = item.href!;
    const active = href === activeHref;
    const count  = item.badge ? badgeCount(item.badge) : 0;

    return (
      <Link
        key={href}
        href={href}
        className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
        title={collapsed ? item.label : undefined}
        onClick={onMobileClose}
      >
        <Icon icon={item.icon} className={styles.navIcon} />
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

  // ── Render category (Level 2) ────────────────────────────────────────────

  function renderCategory(cat: NavCategory) {
    const hasActive = categoryHasActive(cat, activeHref);
    const isOpen    = hasActive || userOpenedCategories.has(cat.label);

    return (
      <div key={cat.label} className={styles.category}>
        <button
          type="button"
          className={`${styles.categoryHeader} ${hasActive ? styles.categoryHeaderActive : ""}`}
          onClick={() => toggleCategory(cat.label, hasActive)}
          aria-expanded={isOpen}
        >
          <Icon icon={cat.icon} className={styles.categoryIcon} />
          <span className={styles.categoryLabel}>{cat.label}</span>
          <ChevronDown
            size={13}
            strokeWidth={2.25}
            className={`${styles.categoryChevron} ${isOpen ? styles.categoryChevronOpen : ""}`}
          />
        </button>

        <div className={`${styles.categoryItems} ${isOpen ? styles.categoryItemsOpen : ""}`}>
          <div className={styles.categoryItemsInner}>
            {cat.items.map(item => renderItem(item))}
          </div>
        </div>
      </div>
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
          {collapsed
            ? <ChevronRight size={16} strokeWidth={1.75} />
            : <ChevronLeft  size={16} strokeWidth={1.75} />
          }
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className={styles.nav}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} className={styles.group}>
            <span className={styles.groupLabel}>{group.label}</span>

            {group.categories
              ? group.categories.map(cat => renderCategory(cat))
              : group.items!.map(item => renderItem(item))
            }
          </div>
        ))}
      </nav>

      {/* ── Footer: settings ── */}
      <div className={styles.footer}>
        {(() => {
          const active = activeHref === "/admin/settings";
          return (
            <Link
              href="/admin/settings"
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              title={collapsed ? "Settings" : undefined}
              onClick={onMobileClose}
            >
              <Icon icon={Settings} className={styles.navIcon} />
              <span className={styles.navLabel}>Settings</span>
              {active && <span className={styles.navActiveBar} />}
            </Link>
          );
        })()}
      </div>

    </aside>
  );
}
