"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./BookingPanel.module.css";

interface PriceBreakdownItem {
  startDate: string;
  endDate: string;
  pricePerDay: number;
  days: number;
  subtotal: number;
  label: string | null;
}

interface PriceResult {
  totalPrice: number;
  numberOfDays: number;
  breakdown: PriceBreakdownItem[];
  basePricePerDay: number | null;
}

interface Labels {
  title: string;
  startDate: string;
  endDate: string;
  selectDates: string;
  available: string;
  unavailable: string;
  totalPrice: string;
  perDay: string;
  days: string;
  breakdown: string;
  baseRate: string;
  bookNow: string;
  submitting: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  dateError: string;
  minimumOneDay: string;
  noPriceConfigured: string;
}

interface Props {
  carId: string;
  locale: string;
  labels: Labels;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function fmt(date: string) {
  return new Date(date + "T00:00:00Z").toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

export default function BookingPanel({ carId, locale, labels }: Props) {
  const router = useRouter();

  const [startDate, setStartDate]       = useState("");
  const [endDate, setEndDate]           = useState("");
  const [available, setAvailable]       = useState<boolean | null>(null);
  const [priceResult, setPriceResult]   = useState<PriceResult | null>(null);
  const [checking, setChecking]         = useState(false);
  const [dateError, setDateError]       = useState("");

  // Contact fields
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState("");

  const fetchAvailabilityAndPrice = useCallback(async (start: string, end: string) => {
    setChecking(true);
    setAvailable(null);
    setPriceResult(null);
    setSubmitError("");

    try {
      const [availRes, priceRes] = await Promise.all([
        fetch(`/next-api/public/cars/${carId}/availability?startDate=${start}&endDate=${end}`),
        fetch(`/next-api/public/cars/${carId}/price?startDate=${start}&endDate=${end}`),
      ]);

      if (availRes.ok) {
        const data = await availRes.json();
        setAvailable(data.available ?? false);
      }

      if (priceRes.ok) {
        const data: PriceResult = await priceRes.json();
        setPriceResult(data);
      }
    } catch {
      // network error — leave states null
    } finally {
      setChecking(false);
    }
  }, [carId]);

  // Re-fetch whenever both dates are valid
  useEffect(() => {
    if (!startDate || !endDate) {
      setAvailable(null);
      setPriceResult(null);
      setDateError("");
      return;
    }
    if (endDate <= startDate) {
      setDateError(labels.dateError);
      setAvailable(null);
      setPriceResult(null);
      return;
    }
    setDateError("");
    fetchAvailabilityAndPrice(startDate, endDate);
  }, [startDate, endDate, fetchAvailabilityAndPrice, labels.dateError]);

  const handleBook = async () => {
    if (!startDate || !endDate || !available || !priceResult) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/next-api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          startDate,
          endDate,
          customerName:  name  || undefined,
          customerEmail: email || undefined,
          customerPhone: phone || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.message ?? "Something went wrong.");
        return;
      }

      router.push(`/${locale}/fleet/${carId}/booking-confirmation?bookingId=${data.id}`);
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canBook = available === true && priceResult !== null && !checking && !submitting;
  const hasNoPricing = priceResult !== null && priceResult.basePricePerDay === null && priceResult.breakdown.length === 0;

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>{labels.title}</h2>

      {/* ── Date inputs ── */}
      <div className={styles.dateRow}>
        <label className={styles.dateField}>
          <span className={styles.dateLabel}>{labels.startDate}</span>
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            min={today()}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className={styles.dateField}>
          <span className={styles.dateLabel}>{labels.endDate}</span>
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            min={startDate || tomorrow()}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>

      {dateError && <p className={styles.errorMsg}>{dateError}</p>}

      {/* ── Availability / price area ── */}
      {checking && (
        <div className={styles.statusRow}>
          <span className={styles.spinner} aria-hidden="true" />
          <span className={styles.statusText}>Checking…</span>
        </div>
      )}

      {!checking && available === true && (
        <div className={`${styles.statusRow} ${styles.statusAvail}`}>
          <span className={styles.statusDot} />
          <span>{labels.available}</span>
        </div>
      )}

      {!checking && available === false && (
        <div className={`${styles.statusRow} ${styles.statusBusy}`}>
          <span className={styles.statusDot} />
          <span>{labels.unavailable}</span>
        </div>
      )}

      {!checking && !startDate && !endDate && (
        <p className={styles.hint}>{labels.selectDates}</p>
      )}

      {/* ── Price summary ── */}
      {!checking && priceResult && !hasNoPricing && (
        <div className={styles.priceBox}>
          <div className={styles.priceSummary}>
            <span className={styles.priceTotal}>€{priceResult.totalPrice.toFixed(2)}</span>
            <span className={styles.priceDays}>
              {priceResult.numberOfDays} {labels.days}
            </span>
          </div>

          {priceResult.breakdown.length > 1 && (
            <div className={styles.breakdown}>
              <span className={styles.breakdownTitle}>{labels.breakdown}</span>
              {priceResult.breakdown.map((item, i) => (
                <div key={i} className={styles.breakdownRow}>
                  <span className={styles.breakdownDates}>
                    {fmt(item.startDate)} – {fmt(item.endDate)}
                    {" "}
                    <span className={styles.breakdownLabel}>
                      {item.label ?? labels.baseRate}
                    </span>
                  </span>
                  <span className={styles.breakdownAmt}>
                    {item.days} × €{item.pricePerDay.toFixed(2)}{labels.perDay}
                    {" = "}
                    <strong>€{item.subtotal.toFixed(2)}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          {priceResult.breakdown.length === 1 && (
            <p className={styles.perDayNote}>
              €{priceResult.breakdown[0].pricePerDay.toFixed(2)}{labels.perDay}
              {priceResult.breakdown[0].label && (
                <span className={styles.breakdownLabel}> · {priceResult.breakdown[0].label}</span>
              )}
            </p>
          )}
        </div>
      )}

      {!checking && hasNoPricing && (
        <p className={styles.hint}>{labels.noPriceConfigured}</p>
      )}

      {/* ── Contact fields (shown once dates are valid + available) ── */}
      {canBook && (
        <div className={styles.contactFields}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{labels.nameLabel}</span>
            <input
              type="text"
              className={styles.fieldInput}
              placeholder={labels.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{labels.emailLabel}</span>
            <input
              type="email"
              className={styles.fieldInput}
              placeholder={labels.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{labels.phoneLabel}</span>
            <input
              type="tel"
              className={styles.fieldInput}
              placeholder={labels.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>
      )}

      {submitError && <p className={styles.errorMsg}>{submitError}</p>}

      {/* ── Book button ── */}
      <button
        className={styles.bookBtn}
        onClick={handleBook}
        disabled={!canBook}
        aria-busy={submitting}
      >
        {submitting ? labels.submitting : labels.bookNow}
      </button>
    </div>
  );
}
