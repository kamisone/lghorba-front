"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import DateTimePicker, { type DateTimePickerHandle } from "@/components/DateTimePicker";
import styles from "./BookingPanel.module.css";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function nowNextSlot(): string {
  const d = new Date();
  const m = d.getMinutes();
  d.setMinutes(m >= 30 ? 60 : 30, 0, 0);
  return d.toISOString().slice(0, 16);
}

function fmtBreakdownDate(date: string) {
  return new Date(date + "T00:00:00Z").toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

function validateField(field: "name" | "email" | "phone", value: string): string {
  const v = value.trim();
  if (field === "name")  return v ? "" : "Name is required";
  if (field === "phone") return v ? "" : "Phone number is required";
  if (field === "email") {
    if (!v) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address";
    return "";
  }
  return "";
}

function fmtStepValue(iso: string): string {
  if (!iso || iso.length < 16) return "";
  const [datePart, timePart] = iso.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const dateStr = new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", timeZone: "UTC",
  });
  return `${dateStr} · ${timePart.slice(0, 5)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookingPanel({ carId, locale, labels }: Props) {
  const router = useRouter();

  const [startDateTime, setStartDateTimeRaw] = useState("");
  const [endDateTime,   setEndDateTimeRaw]   = useState("");
  const [available,     setAvailable]        = useState<boolean | null>(null);
  const [priceResult,   setPriceResult]      = useState<PriceResult | null>(null);
  const [checking,      setChecking]         = useState(false);
  const [dateError,     setDateError]        = useState("");

  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", phone: "" });
  const [touched,     setTouched]     = useState({ name: false, email: false, phone: false });

  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  const endPickerRef = useRef<DateTimePickerHandle>(null);

  // ── Setters that cascade-clear the dependent field ──────────────────────────

  function setStartDateTime(v: string) {
    setStartDateTimeRaw(v);
    // Clear end if it would now be invalid
    if (endDateTime && v && new Date(endDateTime) <= new Date(v)) {
      setEndDateTimeRaw("");
    }
  }

  function setEndDateTime(v: string) {
    setEndDateTimeRaw(v);
  }

  // ── Auto-advance: start complete → open end picker ───────────────────────────

  function handleStartComplete() {
    setTimeout(() => {
      endPickerRef.current?.openPicker();
    }, 160);
  }

  // ── Fetch availability & price ───────────────────────────────────────────────

  const fetchAvailabilityAndPrice = useCallback(async (start: string, end: string) => {
    setChecking(true);
    setAvailable(null);
    setPriceResult(null);
    setSubmitError("");
    try {
      const [availRes, priceRes] = await Promise.all([
        fetch(`/next-api/public/cars/${carId}/availability?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`),
        fetch(`/next-api/public/cars/${carId}/price?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`),
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

  useEffect(() => {
    if (!startDateTime || !endDateTime) {
      setAvailable(null);
      setPriceResult(null);
      setDateError("");
      return;
    }
    const start = new Date(startDateTime);
    const end   = new Date(endDateTime);
    if (start <= new Date()) {
      setDateError("Pick-up time must be in the future");
      setAvailable(null); setPriceResult(null);
      return;
    }
    if (end <= start) {
      setDateError(labels.dateError);
      setAvailable(null); setPriceResult(null);
      return;
    }
    setDateError("");
    fetchAvailabilityAndPrice(startDateTime, endDateTime);
  }, [startDateTime, endDateTime, fetchAvailabilityAndPrice, labels.dateError]);

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleBook = async () => {
    if (!startDateTime || !endDateTime || !available || !priceResult) return;

    // Validate all contact fields before submitting
    const errors = {
      name:  validateField("name",  name),
      email: validateField("email", email),
      phone: validateField("phone", phone),
    };
    setFieldErrors(errors);
    setTouched({ name: true, email: true, phone: true });
    if (errors.name || errors.email || errors.phone) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/next-api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          startDateTime,
          endDateTime,
          customerName:  name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data?.message ?? "Something went wrong."); return; }
      router.push(`/${locale}/fleet/${carId}/booking-confirmation?bookingId=${data.id}`);
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────────

  const canBook      = available === true && priceResult !== null && !checking && !submitting;
  const hasNoPricing = priceResult !== null && priceResult.basePricePerDay === null && priceResult.breakdown.length === 0;
  const minStart     = nowNextSlot();

  // Step state
  const startDone  = !!startDateTime;
  const endDone    = !!endDateTime;
  const stepState  = !startDone ? 0 : !endDone ? 1 : 2;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.panel}>

      {/* ── Step progress indicator ── */}
      <div className={styles.stepFlow} aria-label="Booking steps">
        {/* Step 1 */}
        <div className={[
          styles.stepItem,
          stepState === 0 ? styles.stepActive :
          startDone       ? styles.stepDone   : styles.stepPending,
        ].join(" ")}>
          <span className={styles.stepBadge}>
            {startDone
              ? <span className="material-symbols-outlined">check</span>
              : "1"}
          </span>
          <div className={styles.stepInfo}>
            <span className={styles.stepLabel}>{labels.startDate}</span>
            {startDone && <span className={styles.stepValue}>{fmtStepValue(startDateTime)}</span>}
          </div>
        </div>

        {/* Connector */}
        <span className={`${styles.stepLine} ${startDone ? styles.stepLineDone : ""}`} aria-hidden="true" />

        {/* Step 2 */}
        <div className={[
          styles.stepItem,
          stepState === 1 ? styles.stepActive :
          endDone         ? styles.stepDone   : styles.stepPending,
        ].join(" ")}>
          <span className={styles.stepBadge}>
            {endDone
              ? <span className="material-symbols-outlined">check</span>
              : "2"}
          </span>
          <div className={styles.stepInfo}>
            <span className={styles.stepLabel}>{labels.endDate}</span>
            {endDone && <span className={styles.stepValue}>{fmtStepValue(endDateTime)}</span>}
          </div>
        </div>
      </div>

      {/* ── Date / time pickers ── */}
      <div className={styles.pickersRow}>

        <div className={[
          styles.pickerWrap,
          stepState === 0 ? styles.pickerWrapActive : "",
          startDone       ? styles.pickerWrapDone   : "",
        ].filter(Boolean).join(" ")}>
          <DateTimePicker
            label={labels.startDate}
            value={startDateTime}
            onChange={setStartDateTime}
            minValue={minStart}
            placeholder="Pick-up date & time"
            onComplete={handleStartComplete}
          />
        </div>

        <span className={`${styles.pickersArrow} ${startDone ? styles.pickersArrowActive : ""}`} aria-hidden="true">
          <span className="material-symbols-outlined">arrow_forward</span>
        </span>

        <div className={[
          styles.pickerWrap,
          stepState === 1 ? styles.pickerWrapActive : "",
          endDone         ? styles.pickerWrapDone   : "",
          stepState === 1 ? styles.pickerWrapPulse  : "",
        ].filter(Boolean).join(" ")}>
          <DateTimePicker
            ref={endPickerRef}
            label={labels.endDate}
            value={endDateTime}
            onChange={setEndDateTime}
            minValue={startDateTime || minStart}
            placeholder="Return date & time"
          />
        </div>

      </div>

      {dateError && <p className={styles.errorMsg}>{dateError}</p>}

      {/* ── Status ── */}
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
      {!checking && !startDateTime && !endDateTime && (
        <p className={styles.hint}>{labels.selectDates}</p>
      )}

      {/* ── Price summary ── */}
      {!checking && priceResult && !hasNoPricing && (
        <div className={styles.priceBox}>
          <div className={styles.priceSummary}>
            <span className={styles.priceTotal}>€{priceResult.totalPrice.toFixed(2)}</span>
            <span className={styles.priceDays}>{priceResult.numberOfDays} {labels.days}</span>
          </div>

          {priceResult.breakdown.length > 1 && (
            <div className={styles.breakdown}>
              <span className={styles.breakdownTitle}>{labels.breakdown}</span>
              {priceResult.breakdown.map((item, i) => (
                <div key={i} className={styles.breakdownRow}>
                  <span className={styles.breakdownDates}>
                    {fmtBreakdownDate(item.startDate)} – {fmtBreakdownDate(item.endDate)}
                    {" "}
                    <span className={styles.breakdownLabel}>{item.label ?? labels.baseRate}</span>
                  </span>
                  <span className={styles.breakdownAmt}>
                    {item.days} × €{item.pricePerDay.toFixed(2)}{labels.perDay}
                    {" = "}<strong>€{item.subtotal.toFixed(2)}</strong>
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

      {/* ── Contact fields ── */}
      {canBook && (
        <div className={styles.contactFields}>

          {/* Name */}
          <div className={styles.field}>
            <label htmlFor="bp-name" className={styles.fieldLabel}>
              {labels.nameLabel}<span className={styles.requiredMark} aria-hidden="true"> *</span>
            </label>
            <input
              id="bp-name"
              type="text"
              className={`${styles.fieldInput} ${touched.name && fieldErrors.name ? styles.fieldInputError : ""}`}
              placeholder={labels.namePlaceholder}
              value={name}
              required
              aria-required="true"
              aria-invalid={!!(touched.name && fieldErrors.name)}
              aria-describedby={touched.name && fieldErrors.name ? "bp-name-err" : undefined}
              onChange={e => {
                setName(e.target.value);
                if (touched.name) setFieldErrors(prev => ({ ...prev, name: validateField("name", e.target.value) }));
              }}
              onBlur={() => {
                setTouched(prev => ({ ...prev, name: true }));
                setFieldErrors(prev => ({ ...prev, name: validateField("name", name) }));
              }}
            />
            {touched.name && fieldErrors.name && (
              <span id="bp-name-err" className={styles.fieldError} role="alert">{fieldErrors.name}</span>
            )}
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="bp-email" className={styles.fieldLabel}>
              {labels.emailLabel}<span className={styles.requiredMark} aria-hidden="true"> *</span>
            </label>
            <input
              id="bp-email"
              type="email"
              className={`${styles.fieldInput} ${touched.email && fieldErrors.email ? styles.fieldInputError : ""}`}
              placeholder={labels.emailPlaceholder}
              value={email}
              required
              aria-required="true"
              aria-invalid={!!(touched.email && fieldErrors.email)}
              aria-describedby={touched.email && fieldErrors.email ? "bp-email-err" : undefined}
              onChange={e => {
                setEmail(e.target.value);
                if (touched.email) setFieldErrors(prev => ({ ...prev, email: validateField("email", e.target.value) }));
              }}
              onBlur={() => {
                setTouched(prev => ({ ...prev, email: true }));
                setFieldErrors(prev => ({ ...prev, email: validateField("email", email) }));
              }}
            />
            {touched.email && fieldErrors.email && (
              <span id="bp-email-err" className={styles.fieldError} role="alert">{fieldErrors.email}</span>
            )}
          </div>

          {/* Phone */}
          <div className={styles.field}>
            <label htmlFor="bp-phone" className={styles.fieldLabel}>
              {labels.phoneLabel}<span className={styles.requiredMark} aria-hidden="true"> *</span>
            </label>
            <input
              id="bp-phone"
              type="tel"
              className={`${styles.fieldInput} ${touched.phone && fieldErrors.phone ? styles.fieldInputError : ""}`}
              placeholder={labels.phonePlaceholder}
              value={phone}
              required
              aria-required="true"
              aria-invalid={!!(touched.phone && fieldErrors.phone)}
              aria-describedby={touched.phone && fieldErrors.phone ? "bp-phone-err" : undefined}
              onChange={e => {
                setPhone(e.target.value);
                if (touched.phone) setFieldErrors(prev => ({ ...prev, phone: validateField("phone", e.target.value) }));
              }}
              onBlur={() => {
                setTouched(prev => ({ ...prev, phone: true }));
                setFieldErrors(prev => ({ ...prev, phone: validateField("phone", phone) }));
              }}
            />
            {touched.phone && fieldErrors.phone && (
              <span id="bp-phone-err" className={styles.fieldError} role="alert">{fieldErrors.phone}</span>
            )}
          </div>

          <p className={styles.requiredNote}>* Required fields</p>
        </div>
      )}

      {submitError && <p className={styles.errorMsg}>{submitError}</p>}

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
