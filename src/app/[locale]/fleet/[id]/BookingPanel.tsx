"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import DateTimePicker, { type DateTimePickerHandle } from "@/components/DateTimePicker";
import PhoneInput from "@/components/PhoneInput";
import { getTranslations } from "@/lib/i18n";
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
  prefillFromSearch: string;
  prefillLastSearch: string;
}

interface Props {
  carId: string;
  locale: string;
  labels: Labels;
  initialStart?: string;
  initialEnd?: string;
}

type PrefillSource = "url" | "storage" | null;

// ── Storage helpers ───────────────────────────────────────────────────────────

const LS_KEY = "car_search_context";
const LS_TTL = 7 * 24 * 60 * 60 * 1000;

function isoToLocalDT(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function loadStoredSearch(): { start: string; end: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { start?: string; end?: string; savedAt?: number };
    if (!parsed.start || !parsed.end || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > LS_TTL) { localStorage.removeItem(LS_KEY); return null; }
    return { start: parsed.start, end: parsed.end };
  } catch {
    return null;
  }
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

type ValidationMessages = ReturnType<typeof getTranslations>["booking"]["validation"];

function validateField(
  field: "name" | "email" | "phone",
  value: string,
  v: ValidationMessages,
): string {
  const s = value.trim();
  if (field === "name")  return s ? "" : v.nameRequired;
  if (field === "phone") {
    if (!s) return v.phoneRequired;
    if (s.replace(/\D/g, "").length < 6) return v.phoneInvalid;
    return "";
  }
  if (field === "email") {
    if (!s) return v.emailRequired;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return v.emailInvalid;
    return "";
  }
  return "";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookingPanel({ carId, locale, labels, initialStart, initialEnd }: Props) {
  const router = useRouter();
  const t = getTranslations(locale);

  const [startDateTime, setStartDateTimeRaw] = useState("");
  const [endDateTime,   setEndDateTimeRaw]   = useState("");
  const [prefillSource, setPrefillSource]    = useState<PrefillSource>(null);
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
    setPrefillSource(null);
    if (endDateTime && v && new Date(endDateTime) <= new Date(v)) {
      setEndDateTimeRaw("");
    }
  }

  function setEndDateTime(v: string) {
    setEndDateTimeRaw(v);
    setPrefillSource(null);
  }

  // ── Init: pre-fill from URL params or localStorage ───────────────────────────

  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const now = new Date();
    if (initialStart && initialEnd && new Date(initialStart) > now) {
      setStartDateTimeRaw(isoToLocalDT(initialStart));
      setEndDateTimeRaw(isoToLocalDT(initialEnd));
      setPrefillSource("url");
      return;
    }
    const stored = loadStoredSearch();
    if (stored && new Date(stored.start) > now) {
      setStartDateTimeRaw(isoToLocalDT(stored.start));
      setEndDateTimeRaw(isoToLocalDT(stored.end));
      setPrefillSource("storage");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setDateError(t.booking.pickupFuture);
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
      name:  validateField("name",  name,  t.booking.validation),
      email: validateField("email", email, t.booking.validation),
      phone: validateField("phone", phone, t.booking.validation),
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
      if (!res.ok) { setSubmitError(data?.message ?? t.booking.genericError); return; }
      // Store the clientSecret in sessionStorage — retrieved by the payment page
      sessionStorage.setItem(`stripe_cs_${data.id}`, data.clientSecret);
      router.push(`/${locale}/fleet/${carId}/payment?bookingId=${data.id}`);
    } catch {
      setSubmitError(t.booking.networkError);
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

      {/* ── Unified date-range panel ── */}
      <div className={[
        styles.dateRangePanel,
        startDone && endDone ? styles.dateRangePanelComplete : "",
      ].filter(Boolean).join(" ")}>

        {/* Start date half */}
        <div className={[
          styles.dateRangeHalf,
          stepState === 0 ? styles.dateRangeHalfActive : "",
        ].filter(Boolean).join(" ")}>
          <span className={[
            styles.dateRangeHalfHead,
            stepState === 0 ? styles.dateRangeHalfHeadCurrent :
            startDone       ? styles.dateRangeHalfHeadDone    : "",
          ].filter(Boolean).join(" ")}>
            <span className={styles.dateRangeStepBadge}>
              {startDone
                ? <span className="material-symbols-outlined">check</span>
                : "1"}
            </span>
            {labels.startDate}
          </span>
          <DateTimePicker
            value={startDateTime}
            onChange={setStartDateTime}
            minValue={minStart}
            placeholder="Pick-up date & time"
            onComplete={handleStartComplete}
          />
        </div>

        {/* Vertical divider */}
        <span
          className={`${styles.dateRangeDivider} ${startDone ? styles.dateRangeDividerFilled : ""}`}
          aria-hidden="true"
        />

        {/* End date half */}
        <div className={[
          styles.dateRangeHalf,
          styles.dateRangeHalfRight,
          stepState === 1 ? styles.dateRangeHalfActive : "",
          stepState === 1 ? styles.dateRangeHalfPulse  : "",
        ].filter(Boolean).join(" ")}>
          <span className={[
            styles.dateRangeHalfHead,
            stepState === 1 ? styles.dateRangeHalfHeadCurrent :
            endDone         ? styles.dateRangeHalfHeadDone    : "",
          ].filter(Boolean).join(" ")}>
            <span className={styles.dateRangeStepBadge}>
              {endDone
                ? <span className="material-symbols-outlined">check</span>
                : "2"}
            </span>
            {labels.endDate}
          </span>
          <DateTimePicker
            ref={endPickerRef}
            value={endDateTime}
            onChange={setEndDateTime}
            minValue={startDateTime || minStart}
            placeholder="Return date & time"
          />
        </div>

      </div>

      {/* ── Prefill context banner ── */}
      {prefillSource && (
        <div className={styles.prefillBanner}>
          <span className={styles.prefillBannerIcon}>
            {prefillSource === "url" ? "🔍" : "🕐"}
          </span>
          <span className={styles.prefillBannerText}>
            {prefillSource === "url" ? labels.prefillFromSearch : labels.prefillLastSearch}
          </span>
          <button
            className={styles.prefillBannerDismiss}
            onClick={() => setPrefillSource(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

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
                if (touched.name) setFieldErrors(prev => ({ ...prev, name: validateField("name", e.target.value, t.booking.validation) }));
              }}
              onBlur={() => {
                setTouched(prev => ({ ...prev, name: true }));
                setFieldErrors(prev => ({ ...prev, name: validateField("name", name, t.booking.validation) }));
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
                if (touched.email) setFieldErrors(prev => ({ ...prev, email: validateField("email", e.target.value, t.booking.validation) }));
              }}
              onBlur={() => {
                setTouched(prev => ({ ...prev, email: true }));
                setFieldErrors(prev => ({ ...prev, email: validateField("email", email, t.booking.validation) }));
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
            <PhoneInput
              id="bp-phone"
              value={phone}
              error={!!(touched.phone && fieldErrors.phone)}
              placeholder="6 12 34 56 78"
              onChange={v => {
                setPhone(v);
                if (touched.phone) setFieldErrors(prev => ({ ...prev, phone: validateField("phone", v, t.booking.validation) }));
              }}
              onBlur={() => {
                setTouched(prev => ({ ...prev, phone: true }));
                setFieldErrors(prev => ({ ...prev, phone: validateField("phone", phone, t.booking.validation) }));
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
