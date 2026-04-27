import type { Metadata } from "next";
import AdminHeader from "@/components/layout/AdminHeader";
import TokenRefresher from "@/components/admin/TokenRefresher";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <TokenRefresher />
      <AdminHeader>{children}</AdminHeader>
    </>
  );
}
