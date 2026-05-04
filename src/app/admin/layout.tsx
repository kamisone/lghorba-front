import type { Metadata } from "next";
import AdminHeader from "@/components/layout/AdminHeader";
import TokenRefresher from "@/components/admin/TokenRefresher";

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TokenRefresher />
      <AdminHeader>{children}</AdminHeader>
    </>
  );
}
