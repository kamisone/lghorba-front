import AdminShell from "@/components/admin/shell/AdminShell";

/**
 * Admin-section layout shell — sidebar navigation + content area.
 * Mounted once in app/admin/layout.tsx; never imported by public pages.
 */
export default function AdminHeader({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
