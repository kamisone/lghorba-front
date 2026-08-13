import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import NextTopLoader from "nextjs-toploader";
import "@/app/globals.css";
import { AppMode } from "@/app/config";
import Maintenance from "@/components/Maintenance/Maintenance";
import { ToastProvider } from "@/components/toast/ToastContext";
import Toaster from "@/components/toast/Toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "vitecamion — Car rental on Turo, Getaround & Private",
  description:
    "Premium vehicle rentals available on Turo, Getaround, and direct private booking. Transparent pricing, recent models, flexible bookings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = headers().get("x-locale") ?? "en";

  return (
    <html lang={locale} dir="ltr">
      <head />
      <body className={inter.className}>
        {/* Global nav-in-progress feedback — mounted once here so it covers
            every route (public + admin) instead of each section rolling its
            own. Brand/admin accent color; no spinner, just the top bar. */}
        <NextTopLoader color="#8DC220" height={3} showSpinner={false} shadow="0 0 10px #8DC220,0 0 5px #8DC220" />
        <ToastProvider>
          {process.env.APP_MODE === AppMode.MAINTENANCE ? (
            <Maintenance />
          ) : (
            children
          )}
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
