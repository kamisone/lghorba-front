import type { Metadata } from "next";
import AdminHeader from "@/components/layout/AdminHeader";
import TokenRefresher from "@/components/admin/shell/TokenRefresher";
import { TzProvider } from "@/contexts/TzContext";
import { getBusinessTimezone } from "@/lib/platformSettings";

export const metadata: Metadata = {
  robots: {
    index:   false,
    follow:  false,
    nocache: true,
    googleBot: {
      index:  false,
      follow: false,
    },
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // This layout wraps every /admin/* route, so this fetch ran fresh
  // (cache: "no-store") on every single admin navigation. Admin pages stay
  // dynamic regardless (session-gated), but the timezone itself rarely
  // changes — getBusinessTimezone() caches it for 5 minutes instead of
  // hitting the backend on every request.
  const timezone = await getBusinessTimezone();
  return (
    <TzProvider timezone={timezone}>
      <TokenRefresher />
      <AdminHeader>{children}</AdminHeader>
    </TzProvider>
  );
}
