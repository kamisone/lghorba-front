import type { Metadata } from "next";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CarsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LogoutButton />
      {children}
    </>
  );
}
