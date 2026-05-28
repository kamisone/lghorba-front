import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
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
