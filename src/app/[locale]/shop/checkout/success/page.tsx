import Link from "next/link";
import Script from "next/script";
import { Check, Package } from "lucide-react";
import { getTranslations } from "@/lib/i18n";

interface Props {
  params: { locale: string };
  searchParams?: { order?: string; id?: string; token?: string };
}

export default function CheckoutSuccessPage({ params, searchParams }: Props) {
  const t = getTranslations(params.locale).shop;
  const orderNumber = searchParams?.order;
  const trackingToken = searchParams?.token;

  const trackUrl = orderNumber
    ? `/${params.locale}/shop/orders/track/${orderNumber}${trackingToken ? `?token=${trackingToken}` : ""}`
    : null;

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", textAlign: "center", padding: "0 16px" }}>
      <Script id="clear-cart" strategy="beforeInteractive">{`
        try{var o=localStorage.getItem("shop_cart_token");if(o)sessionStorage.removeItem("checkout:"+o);localStorage.setItem("shop_cart_token",crypto.randomUUID())}catch(e){}
      `}</Script>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "var(--color-brand-accent)", margin: "0 auto 24px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36,
      }}>
        <Check size={14} strokeWidth={2} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 12px", color: "var(--color-text-heading)" }}>
        {t.orderConfirmed}
      </h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1.65, marginBottom: 12 }}>
        {t.orderThankYou}
        {orderNumber && (
          <>
            {" "}{t.orderNumberPrefix}{" "}
            <strong style={{ color: "var(--color-brand-primary)" }}>{orderNumber}</strong>.
          </>
        )}
      </p>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.55, marginBottom: 28 }}>
        {t.orderTrackingInfo}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        {trackUrl && (
          <Link
            href={trackUrl}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 28px",
              background: "var(--color-brand-primary)", color: "#fff",
              borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 15,
              transition: "opacity .18s",
            }}
          >
            <Package size={16} strokeWidth={2} />
            {t.trackMyOrder}
          </Link>
        )}
        <Link
          href={`/${params.locale}/shop`}
          style={{
            display: "inline-block", padding: "11px 24px",
            background: "var(--color-surface)", color: "var(--color-text-heading)",
            border: "1.5px solid var(--color-border)",
            borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: 14,
            transition: "background .18s",
          }}
        >
          {t.continueShoppingCta}
        </Link>
      </div>
    </div>
  );
}
