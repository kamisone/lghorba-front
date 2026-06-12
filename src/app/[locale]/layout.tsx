import { redirect } from "next/navigation";
import { isValidLocale, DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";
import HeaderSwitcher from "@/components/layout/HeaderSwitcher";
import ClientFooter from "@/components/layout/ClientFooter";
import CookieConsentProvider from "@/components/consent/CookieConsentProvider";
import SupportWidget from "@/components/support/SupportWidget";
import { CartProvider } from "@/components/shop/CartContext";
import { WishlistProvider } from "@/components/shop/WishlistContext";
import CartDrawer from "@/components/shop/CartDrawer";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isValidLocale(params.locale)) {
    redirect(`/${DEFAULT_LOCALE}`);
  }

  return (
    <CookieConsentProvider locale={params.locale}>
      <CartProvider locale={params.locale}>
        <WishlistProvider>
          <HeaderSwitcher locale={params.locale} />
          <main>{children}</main>
          <ClientFooter locale={params.locale} />
          <SupportWidget locale={params.locale} />
          <CartDrawer locale={params.locale} />
        </WishlistProvider>
      </CartProvider>
    </CookieConsentProvider>
  );
}
