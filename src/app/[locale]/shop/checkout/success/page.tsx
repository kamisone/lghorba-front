import Link from "next/link";
import { Check } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import ClearCartOnMount from "./ClearCartOnMount";

interface Props {
  params: { locale: string };
  searchParams?: { order?: string; id?: string };
}

export default function CheckoutSuccessPage({ params, searchParams }: Props) {
  const t = getTranslations(params.locale).shop;
  const orderNumber = searchParams?.order;

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", textAlign: "center", padding: "0 16px" }}>
      <ClearCartOnMount />
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
      <p style={{ color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1.65, marginBottom: 28 }}>
        {t.orderThankYou}
        {orderNumber && (
          <>
            {" "}{t.orderNumberPrefix}{" "}
            <strong style={{ color: "var(--color-brand-primary)" }}>{orderNumber}</strong>.
          </>
        )}
      </p>
      <Link
        href={`/${params.locale}/shop`}
        style={{
          display: "inline-block", padding: "13px 28px",
          background: "var(--color-brand-accent)", color: "var(--color-brand-darkest)",
          borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 15,
          transition: "background .18s",
        }}
      >
        {t.continueShoppingCta}
      </Link>
    </div>
  );
}
