import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isValidLocale, DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";
import HeaderSwitcher from "@/components/layout/HeaderSwitcher";
import ClientFooter from "@/components/layout/ClientFooter";
import CookieConsentProvider from "@/components/consent/CookieConsentProvider";
import SupportWidget from "@/components/support/SupportWidget";
import { CartProvider } from "@/components/shop/CartContext";
import { WishlistProvider } from "@/components/shop/WishlistContext";
import CartDrawer from "@/components/shop/CartDrawer";
import MetaPixelLoader from "@/components/tracking/MetaPixelLoader";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

interface MetaPixelConfig { pixelId: string | null; enabled: boolean }

async function fetchMetaPixelConfig(): Promise<MetaPixelConfig> {
  try {
    const res = await fetch(`${API}/public/platform-settings`, { cache: "no-store" });
    if (!res.ok) return { pixelId: null, enabled: false };
    const data = await res.json() as { metaPixel?: MetaPixelConfig };
    return data.metaPixel ?? { pixelId: null, enabled: false };
  } catch {
    return { pixelId: null, enabled: false };
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isValidLocale(params.locale)) {
    redirect(`/${DEFAULT_LOCALE}`);
  }

  const metaPixel = await fetchMetaPixelConfig();

  return (
    <CookieConsentProvider locale={params.locale}>
      <Suspense fallback={null}>
        <MetaPixelLoader pixelId={metaPixel.pixelId} enabled={metaPixel.enabled} />
      </Suspense>
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
