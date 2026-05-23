"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/vendor/dashboard", label: "Dashboard" },
  { href: "/vendor/products",  label: "My Products" },
  { href: "/vendor/orders",    label: "My Orders" },
  { href: "/vendor/payouts",   label: "Payouts" },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();

  async function handleLogout() {
    await fetch("/next-api/vendor/auth", { method: "DELETE" });
    router.push("/vendor/login");
  }

  if (pathname === "/vendor/login" || pathname === "/vendor/register") {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside style={{
        width: 220, background: "#1a1a2e", color: "#fff",
        display: "flex", flexDirection: "column", padding: "24px 0",
      }}>
        <div style={{ padding: "0 20px 24px", fontWeight: 700, fontSize: 18, borderBottom: "1px solid #333" }}>
          Vendor Portal
        </div>
        <nav style={{ flex: 1, padding: "16px 0" }}>
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "block", padding: "10px 20px",
                color: pathname.startsWith(href) ? "#60a5fa" : "#ccc",
                background: pathname.startsWith(href) ? "rgba(96,165,250,0.1)" : "transparent",
                textDecoration: "none", fontSize: 14,
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #333" }}>
          <Link href="/vendor/onboarding" style={{ display: "block", marginBottom: 8, color: "#a78bfa", fontSize: 13, textDecoration: "none" }}>
            Stripe Onboarding
          </Link>
          <button
            onClick={handleLogout}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13, padding: 0 }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, background: "#f9fafb" }}>
        {children}
      </main>
    </div>
  );
}
