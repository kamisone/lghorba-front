import type { Metadata } from "next";
import AdminHeader from "@/components/layout/AdminHeader";
import TokenRefresher from "@/components/admin/TokenRefresher";
import { TzProvider } from "@/contexts/TzContext";

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

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function fetchBusinessTimezone(): Promise<string> {
  try {
    const res = await fetch(`${API}/public/platform-settings`, {
      cache: "no-store",
    });
    if (!res.ok) return "Europe/Paris";
    const data = await res.json() as { timezone?: string };
    return data.timezone ?? "Europe/Paris";
  } catch {
    return "Europe/Paris";
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const timezone = await fetchBusinessTimezone();
  return (
    <TzProvider timezone={timezone}>
      <TokenRefresher />
      <AdminHeader>{children}</AdminHeader>
    </TzProvider>
  );
}
