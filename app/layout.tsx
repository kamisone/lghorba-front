import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { AppMode } from "@/app/globals";
import { ToastProvider } from "@/app/components/toast/ToastContext";
import Toaster from "@/app/components/toast/Toaster";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lghorba.com | الغُربَة دُوت كُومْ",
  description: "Lghorba | الغُرْبَة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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


