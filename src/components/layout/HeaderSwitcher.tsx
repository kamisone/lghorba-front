"use client";

import { usePathname } from "next/navigation";
import ClientHeader from "./ClientHeader";
import CommerceHeader from "./CommerceHeader";

interface Props {
  locale: string;
}

const COMMERCE_PREFIXES = ["/shop", "/cart", "/checkout", "/account", "/orders", "/wishlist"];

export default function HeaderSwitcher({ locale }: Props) {
  const pathname = usePathname() ?? "";
  const path = pathname.slice(`/${locale}`.length) || "/";

  const isCommerce = COMMERCE_PREFIXES.some(
    prefix => path === prefix || path.startsWith(`${prefix}/`)
  );

  return isCommerce ? <CommerceHeader locale={locale} /> : <ClientHeader locale={locale} />;
}
