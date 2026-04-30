"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getTranslations } from "@/lib/i18n";
import styles from "./payment.module.css";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

// ── Inner form (must be inside <Elements>) ────────────────────────────────────

function CheckoutForm({
  bookingId,
  carId,
  locale,
  returnBase,
}: {
  bookingId: string;
  carId: string;
  locale: string;
  returnBase: string;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const t        = getTranslations(locale);

  const [paying,        setPaying]        = useState(false);
  const [elementsReady, setElementsReady] = useState(false);
  const [errorMsg,      setErrorMsg]      = useState("");

  const isLoading = !stripe || !elementsReady;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || paying) return;

    setPaying(true);
    setErrorMsg("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${returnBase}/${locale}/fleet/${carId}/booking-confirmation?bookingId=${bookingId}`,
      },
    });

    // confirmPayment only returns on error — success redirects the page
    if (error) {
      setErrorMsg(error.message ?? t.payment.failed);
      setPaying(false);
    }
    // On success: paying stays true until the redirect completes
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={styles.elementsWrap}
      aria-busy={paying}
    >
      {/* PaymentElement with loading overlay */}
      <div className={`${styles.elementContainer} ${(isLoading || paying) ? styles.elementContainerLocked : ""}`}>
        <PaymentElement onReady={() => setElementsReady(true)} />
        {isLoading && (
          <div className={styles.elementOverlay}>
            <span className={styles.spinner} />
            <span className={styles.elementOverlayText}>{t.payment.preparing}</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <p className={styles.errorMsg} role="alert">
          <span className={styles.errorIcon} aria-hidden="true">⚠</span>
          {errorMsg}
        </p>
      )}

      <button
        className={`${styles.payBtn} ${paying ? styles.payBtnProcessing : ""}`}
        type="submit"
        disabled={isLoading || paying}
      >
        {(paying || isLoading) && <span className={styles.btnSpinner} />}
        <span>
          {paying
            ? t.payment.processing
            : isLoading
            ? t.payment.preparing
            : t.payment.payNow}
        </span>
      </button>

      {paying ? (
        <p className={styles.processingNote}>
          {t.booking.paymentConfirmingDesc}
        </p>
      ) : (
        <p className={styles.secure}>🔒 {t.payment.secure}</p>
      )}
    </form>
  );
}

// ── Outer wrapper — reads clientSecret from sessionStorage ────────────────────

export default function PaymentForm({
  bookingId,
  carId,
  locale,
  totalPrice,
  carName,
  startDateTime,
  endDateTime,
}: {
  bookingId: string;
  carId: string;
  locale: string;
  totalPrice: number;
  carName: string;
  startDateTime: string;
  endDateTime: string;
}) {
  const t = getTranslations(locale);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [missing,      setMissing]      = useState(false);

  useEffect(() => {
    const cs = sessionStorage.getItem(`stripe_cs_${bookingId}`);
    if (cs) {
      setClientSecret(cs);
      sessionStorage.removeItem(`stripe_cs_${bookingId}`);
    } else {
      setMissing(true);
    }
  }, [bookingId]);

  const returnBase = typeof window !== "undefined" ? window.location.origin : "";

  function fmtDT(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (missing) {
    return (
      <div className={styles.card}>
        <div className={styles.stateCenter}>
          <p>{t.payment.sessionNotFound}</p>
          <a href={`/${locale}/fleet/${carId}`} className={styles.backLink}>
            {t.booking.backToVehicle}
          </a>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className={styles.card}>
        <div className={styles.stateCenter}>
          <span className={styles.spinner} />
          <p>{t.payment.preparing}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.payment.title}</h1>
        <p className={styles.sub}>{t.payment.subtitle}</p>
      </div>

      <div className={styles.summary}>
        {carName && (
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>{t.payment.vehicle}</span>
            <span className={styles.summaryValue}>{carName}</span>
          </div>
        )}
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>{t.payment.pickup}</span>
          <span className={styles.summaryValue}>{fmtDT(startDateTime)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>{t.payment.return}</span>
          <span className={styles.summaryValue}>{fmtDT(endDateTime)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>{t.payment.total}</span>
          <span className={`${styles.summaryValue} ${styles.summaryTotal}`}>
            €{totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
        <CheckoutForm bookingId={bookingId} carId={carId} locale={locale} returnBase={returnBase} />
      </Elements>

      <a href={`/${locale}/fleet/${carId}`} className={styles.backLink}>
        {t.payment.cancelGoBack}
      </a>
    </div>
  );
}
