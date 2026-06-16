"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Check } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "@/components/shop/CartContext";
import PromoCodeInput from "@/components/shop/PromoCodeInput";
import PriceBreakdown from "@/components/shop/PriceBreakdown";
import { getTranslations } from "@/lib/i18n";
import styles from "./Checkout.module.css";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

function centsToEuros(c: number) { return (c / 100).toFixed(2); }

interface CountryOption { isoCode: string; name: string; }
interface ShippingMethod { id: string; name: string; priceCents: number; estimatedDaysMin: number; estimatedDaysMax: number; }
interface CheckoutSnapshot {
  orderId: string;
  orderNumber: string;
  status: string;
  subtotalCents: number;
  shippingCents: number;
  categoryDiscountCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  shippingMethodId: string | null;
  shippingMethods: ShippingMethod[];
  reservationExpiresAt: string | null;
}

// ── Reservation countdown ──────────────────────────────────────────────────────

function ReservationTimer({ expiresAt, locale }: { expiresAt: string; locale: string }) {
  const t = getTranslations(locale).shop;
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const urgent  = remaining < 300;

  return (
    <p className={`${styles.reservationTimer} ${urgent ? styles.reservationUrgent : ""}`}>
      {remaining > 0
        ? `${t.reservationTimer} ${minutes}:${String(seconds).padStart(2, "0")}`
        : t.reservationExpired}
    </p>
  );
}

// ── Stripe payment form ────────────────────────────────────────────────────────

function StripePaymentForm({ orderId, orderNumber, locale, total }: { orderId: string; orderNumber: string; locale: string; total: number }) {
  const t      = getTranslations(locale).shop;
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError]   = useState("");

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || paying) return;
    setPaying(true);
    setError("");

    const { error: submitError } = await elements.submit();
    if (submitError) { setError(submitError.message ?? "Payment error"); setPaying(false); return; }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/shop/checkout/success?order=${orderNumber}&id=${orderId}`,
      },
    });
    if (confirmError) { setError(confirmError.message ?? "Payment failed"); setPaying(false); }
  }

  return (
    <form onSubmit={handlePay} className={styles.stripeForm}>
      <PaymentElement />
      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={15} className={styles.errorIcon} />
          {error}
        </p>
      )}
      <button type="submit" disabled={paying || !stripe} className={styles.payBtn}>
        {paying ? t.processing : `${t.payPrefix}€${centsToEuros(total)}`}
      </button>
    </form>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────

type Step = "address" | "shipping" | "payment";

function StepIndicator({ current, locale }: { current: Step; locale: string }) {
  const t = getTranslations(locale).shop;
  const STEP_LABELS: Record<Step, string> = { address: t.stepAddress, shipping: t.stepShipping, payment: t.stepPayment };
  const steps: Step[] = ["address", "shipping", "payment"];
  return (
    <div className={styles.steps}>
      {steps.map((s, i) => {
        const done    = steps.indexOf(current) > i;
        const active  = current === s;
        return (
          <div key={s} className={styles.stepItem}>
            <div className={`${styles.stepDot} ${active ? styles.stepDotActive : done ? styles.stepDotDone : ""}`}>
              {done ? <Check size={14} strokeWidth={2} /> : i + 1}
            </div>
            <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : done ? styles.stepLabelDone : ""}`}>
              {STEP_LABELS[s]}
            </span>
            {i < steps.length - 1 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main checkout page ─────────────────────────────────────────────────────────

export default function CheckoutPage({ params }: { params: { locale: string } }) {
  const { cart, token, appliedCoupon, setAppliedCoupon } = useCart();
  const { locale } = params;
  const t = getTranslations(locale).shop;

  const [countries, setCountries]         = useState<CountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [step, setStep]           = useState<Step>("address");
  const [snapshot, setSnapshot]   = useState<CheckoutSnapshot | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [submitting, setSubmitting]       = useState(false);
  const [formError, setFormError]         = useState("");
  const [nameGroupError, setNameGroupError] = useState("");

  const [form, setForm] = useState({
    email: "", firstName: "", lastName: "", companyName: "", phone: "",
    line1: "", line2: "", city: "", zip: "", country: "MA",
  });

  const [shippingUpdating, setShippingUpdating] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const orderIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/next-api/public/shop/countries")
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setCountries(data); })
      .catch(() => {})
      .finally(() => setCountriesLoading(false));
  }, []);

  async function handleApplyCoupon(code: string) {
    const subtotalCents = cart?.subtotalCents ?? 0;
    const res = await fetch(`/next-api/public/shop/cart/${token}/validate-coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotalCents }),
    });
    return res.json();
  }

  async function handleSubmitAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!cart?.items.length) return;

    const hasName    = form.firstName.trim() && form.lastName.trim();
    const hasCompany = form.companyName.trim();
    if (!hasName && !hasCompany) {
      setNameGroupError(t.nameOrCompanyRequired);
      return;
    }
    setNameGroupError("");

    setSubmitting(true);
    setFormError("");

    const res = await fetch("/next-api/public/shop/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartToken:   token,
        email:       form.email,
        firstName:   form.firstName,
        lastName:    form.lastName,
        companyName: form.companyName || null,
        phone:       form.phone || null,
        line1:       form.line1,
        line2:       form.line2 || null,
        city:        form.city,
        zip:         form.zip,
        country:     form.country,
        couponCode:  appliedCoupon?.code ?? null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setFormError((err as any).message ?? t.checkoutEmpty);
      setSubmitting(false);
      return;
    }

    const snap: CheckoutSnapshot = await res.json();
    setSnapshot(snap);
    orderIdRef.current = snap.orderId;

    if (snap.shippingMethods.length > 0) {
      const firstId = snap.shippingMethods[0].id;
      setSelectedMethodId(firstId);
      await applyShippingMethod(snap.orderId, firstId, snap);
    } else {
      setStep("shipping");
    }
    setSubmitting(false);
  }

  async function applyShippingMethod(orderId: string, methodId: string, currentSnap?: CheckoutSnapshot) {
    setShippingUpdating(true);
    const res = await fetch(`/next-api/public/shop/checkout/${orderId}/shipping`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shippingMethodId: methodId }),
    });
    if (res.ok) {
      const updated: CheckoutSnapshot = await res.json();
      setSnapshot(updated);
      setSelectedMethodId(updated.shippingMethodId);
      if (currentSnap) setStep("shipping");
    }
    setShippingUpdating(false);
  }

  async function handleConfirmShipping(e: React.FormEvent) {
    e.preventDefault();
    if (!snapshot || !selectedMethodId) return;
    setSubmitting(true);
    setFormError("");

    if (snapshot.shippingMethodId !== selectedMethodId) {
      await applyShippingMethod(snapshot.orderId, selectedMethodId);
    }

    const intentRes = await fetch(`/next-api/public/shop/checkout/${snapshot.orderId}/payment-intent`, { method: "POST" });
    if (!intentRes.ok) {
      const err = await intentRes.json().catch(() => ({}));
      setFormError((err as any).message ?? t.failedPaymentInit);
      setSubmitting(false);
      return;
    }

    const { clientSecret: cs } = await intentRes.json();
    setClientSecret(cs);
    setStep("payment");
    setSubmitting(false);
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>{t.checkoutEmpty}</h2>
        <a href={`/${locale}/shop`}>{t.continueShopping}</a>
      </div>
    );
  }

  // Derive breakdown from server snapshot when available, else from cart
  const breakdownSubtotal          = snapshot?.subtotalCents ?? cart.subtotalCents;
  const breakdownShipping          = snapshot?.shippingCents;
  const breakdownCategoryDiscount  = snapshot?.categoryDiscountCents ?? 0;
  const breakdownCouponDiscount    = snapshot?.discountCents ?? (appliedCoupon?.discountCents ?? 0);
  const breakdownCouponCode        = snapshot?.couponCode   ?? appliedCoupon?.code ?? null;
  const breakdownTotal             = snapshot?.totalCents   ?? Math.max(0, cart.subtotalCents - breakdownCouponDiscount);
  const shippingMethods            = snapshot?.shippingMethods ?? [];
  const checkoutInitiated          = step !== "address";

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>{t.checkoutTitle}</h1>
      <StepIndicator current={step} locale={locale} />

      <div className={styles.layout}>
        {/* ── Left: step form ── */}
        <div className={styles.formSection}>

          {/* STEP 1 — Address */}
          {step === "address" && (
            <form onSubmit={handleSubmitAddress}>
              <h2 className={styles.sectionTitle}>{t.contactInfo}</h2>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>{t.firstName}<span className={styles.requiredMark} aria-hidden="true"> *</span></label>
                  <input value={form.firstName} onChange={e => { setForm(f => ({ ...f, firstName: e.target.value })); setNameGroupError(""); }} />
                </div>
                <div className={styles.field}>
                  <label>{t.lastName}<span className={styles.requiredMark} aria-hidden="true"> *</span></label>
                  <input value={form.lastName} onChange={e => { setForm(f => ({ ...f, lastName: e.target.value })); setNameGroupError(""); }} />
                </div>
              </div>
              <div className={styles.field}>
                <label>{t.companyNameOptional}</label>
                <input value={form.companyName} onChange={e => { setForm(f => ({ ...f, companyName: e.target.value })); setNameGroupError(""); }} />
              </div>
              <p className={styles.requiredNote}>{t.requiredNote}</p>
              {nameGroupError && (
                <p className={styles.error} role="alert">
                  <AlertCircle size={15} className={styles.errorIcon} />
                  {nameGroupError}
                </p>
              )}
              <div className={styles.field}>
                <label>{t.emailLabel}<span className={styles.requiredMark} aria-hidden="true"> *</span></label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>{t.phoneOptional}</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>

              <h2 className={styles.sectionTitle}>{t.shippingAddressTitle}</h2>
              <div className={styles.field}>
                <label>{t.countryLabel}<span className={styles.requiredMark} aria-hidden="true"> *</span></label>
                <select
                  required
                  disabled={countriesLoading}
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                >
                  {countriesLoading
                    ? <option value="">{t.loading}</option>
                    : <>
                        <option value="">{t.selectCountryPlaceholder}</option>
                        {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                      </>
                  }
                </select>
              </div>
              <div className={styles.field}>
                <label>{t.addressLine1}<span className={styles.requiredMark} aria-hidden="true"> *</span></label>
                <input required value={form.line1} onChange={e => setForm(f => ({ ...f, line1: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>{t.addressLine2}</label>
                <input value={form.line2} onChange={e => setForm(f => ({ ...f, line2: e.target.value }))} />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>{t.cityLabel}<span className={styles.requiredMark} aria-hidden="true"> *</span></label>
                  <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>{t.zipLabel}<span className={styles.requiredMark} aria-hidden="true"> *</span></label>
                  <input required value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
                </div>
              </div>

              {formError && (
                <p className={styles.error} role="alert">
                  <AlertCircle size={15} className={styles.errorIcon} />
                  {formError}
                </p>
              )}
              <button type="submit" disabled={submitting} className={styles.continueBtn}>
                {submitting ? t.processing : t.continueToShipping}
              </button>
            </form>
          )}

          {/* STEP 2 — Shipping */}
          {step === "shipping" && snapshot && (
            <form onSubmit={handleConfirmShipping}>
              <h2 className={styles.sectionTitle}>{t.shippingMethodTitle}</h2>
              {snapshot.reservationExpiresAt && (
                <ReservationTimer expiresAt={snapshot.reservationExpiresAt} locale={locale} />
              )}
              {shippingMethods.length === 0 && (
                <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                  {t.noShippingOptions}
                </p>
              )}
              <div className={styles.shippingMethods}>
                {shippingMethods.map(m => (
                  <label key={m.id} className={`${styles.shippingOption} ${selectedMethodId === m.id ? styles.shippingOptionSelected : ""}`}>
                    <input
                      type="radio" name="shipping" value={m.id}
                      checked={selectedMethodId === m.id}
                      onChange={() => { setSelectedMethodId(m.id); applyShippingMethod(snapshot.orderId, m.id); }}
                    />
                    <span className={styles.shippingName}>{m.name}</span>
                    <span className={styles.shippingDays}>{m.estimatedDaysMin}–{m.estimatedDaysMax} {t.days}</span>
                    <span className={styles.shippingPrice}>
                      {m.priceCents === 0 ? <span style={{ color: "#16a34a", fontWeight: 700 }}>{t.free}</span> : `€${centsToEuros(m.priceCents)}`}
                    </span>
                  </label>
                ))}
              </div>

              <div className={styles.actionRow}>
                <button type="button" onClick={() => setStep("address")} className={styles.backBtn}>{t.back}</button>
                <button
                  type="submit"
                  disabled={submitting || shippingUpdating || !selectedMethodId}
                  className={styles.continueBtn}
                  style={{ flex: 1 }}
                >
                  {submitting ? t.processing : t.continueToPayment}
                </button>
              </div>
              {formError && (
                <p className={styles.error} role="alert">
                  <AlertCircle size={15} className={styles.errorIcon} />
                  {formError}
                </p>
              )}
            </form>
          )}

          {/* STEP 3 — Payment */}
          {step === "payment" && snapshot && (
            <div>
              <h2 className={styles.sectionTitle}>{t.paymentTitle}</h2>
              {snapshot.reservationExpiresAt && (
                <ReservationTimer expiresAt={snapshot.reservationExpiresAt} locale={locale} />
              )}
              {clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" }, locale: locale as any }}>
                  <StripePaymentForm
                    orderId={snapshot.orderId}
                    orderNumber={snapshot.orderNumber}
                    locale={locale}
                    total={snapshot.totalCents}
                  />
                </Elements>
              )}
            </div>
          )}
        </div>

        {/* ── Right: order summary ── */}
        <div className={styles.summary}>
          <h3>{t.checkoutOrderSummary}</h3>

          {/* Line items */}
          <div className={`${styles.lineItems} ${cart.items.length > 4 ? styles.lineItemsCarousel : ""}`}>
            {cart.items.map(item => (
              <div key={item.id} className={`${styles.summaryItem} ${cart.items.length > 4 ? styles.summaryItemCard : ""}`}>
                <div className={styles.summaryItemImage}>
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.titleSnapshot} fill sizes="56px" style={{ objectFit: "cover" }} />
                  ) : (
                    <div className={styles.summaryItemImagePlaceholder} />
                  )}
                  {item.quantity > 1 && <span className={styles.summaryItemQtyBadge}>×{item.quantity}</span>}
                </div>
                <span className={styles.summaryItemName}>
                  {item.titleSnapshot}
                  {item.optionsSnapshot && item.optionsSnapshot.length > 0 && (
                    <span className={styles.summaryItemOptions}>
                      {item.optionsSnapshot.map(o => `${o.attributeName}: ${o.displayValue ?? o.value}`).join(" · ")}
                    </span>
                  )}
                </span>
                <span className={styles.summaryItemPrice}>€{centsToEuros(item.lineTotalCents)}</span>
              </div>
            ))}
          </div>

          {/* Promo code input (only visible before checkout is initiated) */}
          {!checkoutInitiated && (
            <div className={styles.summaryPromo}>
              <PromoCodeInput
                onValidate={handleApplyCoupon}
                onApply={(code, result) => setAppliedCoupon({ code, discountCents: result.discountCents, type: result.type })}
                onRemove={() => setAppliedCoupon(null)}
                appliedCode={appliedCoupon?.code}
                appliedDiscountCents={appliedCoupon?.discountCents}
                locked={checkoutInitiated}
              />
            </div>
          )}

          {/* Price breakdown */}
          <div className={styles.summaryBreakdown}>
            <PriceBreakdown
              subtotalCents={breakdownSubtotal}
              shippingCents={breakdownShipping}
              categoryDiscountCents={breakdownCategoryDiscount}
              couponDiscountCents={breakdownCouponDiscount}
              couponCode={breakdownCouponCode}
              totalCents={breakdownTotal}
            />
          </div>

          {/* Coupon locked notice */}
          {checkoutInitiated && snapshot?.couponCode && (
            <p className={styles.couponLockedNote}>
              {t.promoCodeLabel} <strong>{snapshot.couponCode}</strong> {t.promoAppliedLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
