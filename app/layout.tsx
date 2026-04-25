import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "@/app/globals.css";
import { AppMode } from "@/app/globals";
import { ToastProvider } from "@/app/components/toast/ToastContext";
import Toaster from "@/app/components/toast/Toaster";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "vitecamion — Car rental on Turo, Getaround & Private",
  description: "Premium vehicle rentals available on Turo, Getaround, and direct private booking. Transparent pricing, recent models, flexible bookings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = headers();
  const locale = headersList.get("x-locale") ?? "en";
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir}>
      <body className={inter.className}>
        <ToastProvider>
          <main>
            {(function () {
              switch (process.env.APP_MODE) {
                // case AppMode.MAINTENANCE:
                //   return <Maintenance />;
                default:
                  return children;
              }
            })()}
          </main>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}


