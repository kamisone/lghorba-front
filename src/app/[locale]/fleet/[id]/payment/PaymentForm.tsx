"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
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

  const [paying,   setPaying]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setErrorMsg("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${returnBase}/${locale}/fleet/${carId}/booking-confirmation?bookingId=${bookingId}`,
      },
    });

    // confirmPayment only returns here on error — success redirects the page
    if (error) {
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.elementsWrap}>
      <PaymentElement />
      {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
      <button className={styles.payBtn} type="submit" disabled={!stripe || paying}>
        {paying ? "Processing…" : "Pay now"}
      </button>
      <p className={styles.secure}>🔒 Secured by Stripe</p>
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
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [missing,      setMissing]      = useState(false);

  useEffect(() => {
    const cs = sessionStorage.getItem(`stripe_cs_${bookingId}`);
    if (cs) {
      setClientSecret(cs);
      // Remove from sessionStorage — one-time use
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
          <p>Payment session not found.</p>
          <a href={`/${locale}/fleet/${carId}`} className={styles.backLink}>← Back to vehicle</a>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className={styles.card}>
        <div className={styles.stateCenter}>
          <span className={styles.spinner} />
          <p>Preparing payment…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Complete your booking</h1>
        <p className={styles.sub}>Enter your payment details below</p>
      </div>

      <div className={styles.summary}>
        {carName && (
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Vehicle</span>
            <span className={styles.summaryValue}>{carName}</span>
          </div>
        )}
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Pick-up</span>
          <span className={styles.summaryValue}>{fmtDT(startDateTime)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Return</span>
          <span className={styles.summaryValue}>{fmtDT(endDateTime)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Total</span>
          <span className={`${styles.summaryValue} ${styles.summaryTotal}`}>
            €{totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: { theme: "stripe" },
        }}
      >
        <CheckoutForm
          bookingId={bookingId}
          carId={carId}
          locale={locale}
          returnBase={returnBase}
        />
      </Elements>

      <a href={`/${locale}/fleet/${carId}`} className={styles.backLink}>
        ← Cancel and go back
      </a>
    </div>
  );
}
