"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href:               string;
  locale:             string;
  linkClassName:      string;
  activeLinkClassName: string;
  children:           React.ReactNode;
}

export default function ActiveNavLink({
  href,
  locale,
  linkClassName,
  activeLinkClassName,
  children,
}: Props) {
  const pathname = usePathname();

  const isActive = () => {
    if (href.includes("#")) return false;
    if (href === `/${locale}`) return pathname === `/${locale}`;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Link
      href={href}
      className={[linkClassName, isActive() ? activeLinkClassName : ""].filter(Boolean).join(" ")}
    >
      {children}
    </Link>
  );
}
