"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import { api } from "@/lib/api";
import styles from "./booking-confirmation.module.css";

interface Props {
  bookingId: string;
  locale: string;
}

const CYCLE_MS = 2800;
const FADE_MS  = 350;
const POLL_MS  = 3000;

export default function PaymentWaitingState({ bookingId, locale }: Props) {
  const router = useRouter();
  const t      = getTranslations(locale);

  const steps = useMemo(() => [
    t.booking.paymentStep1,
    t.booking.paymentStep2,
    t.booking.paymentStep3,
  ], [t]);

  const [stepIdx, setStepIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const tidRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cycle messages with fade-out → swap → fade-in
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      tidRef.current = setTimeout(() => {
        setStepIdx(i => (i + 1) % steps.length);
        setVisible(true);
      }, FADE_MS);
    }, CYCLE_MS);

    return () => {
      clearInterval(id);
      if (tidRef.current) clearTimeout(tidRef.current);
    };
  }, [steps.length]);

  // Poll for status change
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const data = await api.bookings.getById(bookingId);
        if (data.status === "confirmed" || data.status === "cancelled") {
          router.refresh();
        }
      } catch { /* silent */ }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [bookingId, router]);

  return (
    <div className={styles.waitingState}>
      {/* Spinner */}
      <div className={styles.waitingRing} aria-hidden="true">
        <span className={styles.waitingSpinner} />
        <span className={styles.waitingSpinnerInner} />
      </div>

      {/* Step dots */}
      <div className={styles.waitingDots} aria-hidden="true">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`${styles.waitingDot} ${i === stepIdx ? styles.waitingDotActive : ""}`}
          />
        ))}
      </div>

      {/* Cycling message */}
      <p
        className={styles.waitingMsg}
        style={{ opacity: visible ? 1 : 0 }}
        aria-live="polite"
        aria-atomic="true"
      >
        {steps[stepIdx]}
      </p>

      {/* Persistent warning */}
      <div className={styles.waitingWarning} role="status">
        <span className={styles.waitingWarningIcon} aria-hidden="true"><AlertTriangle size={16} strokeWidth={1.75} /></span>
        <span>{t.booking.paymentWarning}</span>
      </div>
    </div>
  );
}
