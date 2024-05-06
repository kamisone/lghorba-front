import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import Maintenance from "./components/Maintenance/Maintenance";
import {AppMode} from '@/app/globals';


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
        <main>
          {(function () {
            switch (process.env.APP_MODE) {
              case AppMode.MAINTENANCE:
                return <Maintenance />;
              default:
                return children;
            }
          })()}
        </main>
      </body>
    </html>
  );
}


