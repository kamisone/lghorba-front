"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import DateTimePicker, { type DateTimePickerHandle } from "@/components/DateTimePicker";
import PhoneInput from "@/components/PhoneInput";
import AddressAutocomplete, { type SelectedAddress } from "@/components/AddressAutocomplete";
import { getTranslations } from "@/lib/i18n";
import { saveSearchContext } from "@/lib/searchContext";
import { useSearchContext } from "@/hooks/useSearchContext";
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
  pickupPlaceholder: string;
  returnPlaceholder: string;
  checking: string;
  requiredNote: string;
}

interface DeliveryValidation {
  available: boolean;
  fee: number | null;
}

export interface DeliveryLocationOption {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  radiusKm: number;
  price: number | null;
}

interface Props {
  carId: string;
  locale: string;
  labels: Labels;
  deliveryEnabled?: boolean;
  deliveryType?: "radius" | "location" | null;
  deliveryLocations?: DeliveryLocationOption[];
}

type PrefillSource = "url" | "storage" | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoToLocalDT(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

export default function BookingPanel({ carId, locale, labels, deliveryEnabled = false, deliveryType = null, deliveryLocations = [] }: Props) {
  const router = useRouter();
  const t = getTranslations(locale);
  const searchCtx = useSearchContext();

  const [startDateTime, setStartDateTimeRaw] = useState("");
  const [endDateTime,   setEndDateTimeRaw]   = useState("");
  const [startISO,      setStartISOraw]      = useState("");
  const [endISO,        setEndISOraw]        = useState("");
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

  // ── Delivery state ────────────────────────────────────────────────────────────
  const [deliveryMode,       setDeliveryMode]       = useState<"pickup" | "delivery">("pickup");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [deliveryAddress,    setDeliveryAddress]    = useState<SelectedAddress | null>(null);
  const [deliveryValidation, setDeliveryValidation] = useState<DeliveryValidation | null>(null);
  const [checkingDelivery,   setCheckingDelivery]   = useState(false);

  const endPickerRef = useRef<DateTimePickerHandle>(null);

  // ── Setters that cascade-clear the dependent field ──────────────────────────

  function setStartDateTime(v: string) {
    setStartDateTimeRaw(v);
    setStartISOraw(v ? new Date(v).toISOString() : "");
    setPrefillSource(null);
    if (endDateTime && v && new Date(endDateTime) <= new Date(v)) {
      setEndDateTimeRaw("");
      setEndISOraw("");
    }
  }

  function setEndDateTime(v: string) {
    setEndDateTimeRaw(v);
    setEndISOraw(v ? new Date(v).toISOString() : "");
    setPrefillSource(null);
  }

  // ── Init: pre-fill from URL params or localStorage via hook ─────────────────

  useEffect(() => {
    if (!searchCtx) return;
    setStartDateTimeRaw(isoToLocalDT(searchCtx.start));
    setEndDateTimeRaw(isoToLocalDT(searchCtx.end));
    setStartISOraw(searchCtx.start);
    setEndISOraw(searchCtx.end);
    setPrefillSource(searchCtx.source);
    if (deliveryEnabled && deliveryType === "radius" && searchCtx.address) {
      setDeliveryAddress({ lat: searchCtx.address.lat, lng: searchCtx.address.lng, label: searchCtx.address.label });
      setDeliveryMode("delivery");
    }
  }, [searchCtx, deliveryEnabled, deliveryType]);

  // ── Auto-advance: start complete → open end picker ───────────────────────────

  function handleStartComplete() {
    setTimeout(() => {
      endPickerRef.current?.openPicker();
    }, 160);
  }

  // ── Sync valid dates (and delivery address) back to search context ───────────

  useEffect(() => {
    if (!startISO || !endISO) return;
    if (new Date(startISO) <= new Date() || new Date(endISO) <= new Date(startISO)) return;
    const addr = deliveryAddress
      ? { lat: deliveryAddress.lat, lng: deliveryAddress.lng, label: deliveryAddress.label }
      : undefined;
    saveSearchContext(startISO, endISO, addr);
  }, [startISO, endISO, deliveryAddress]);

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
    if (!startISO || !endISO) {
      setAvailable(null);
      setPriceResult(null);
      setDateError("");
      return;
    }
    const start = new Date(startISO);
    const end   = new Date(endISO);
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
    fetchAvailabilityAndPrice(startISO, endISO);
  }, [startISO, endISO, fetchAvailabilityAndPrice, labels.dateError, t.booking.pickupFuture]);

  // ── Validate delivery address (radius mode only) ──────────────────────────────

  useEffect(() => {
    if (!deliveryEnabled || deliveryType !== "radius" || deliveryMode !== "delivery" || !deliveryAddress) {
      setDeliveryValidation(null);
      return;
    }
    const controller = new AbortController();
    setCheckingDelivery(true);
    setDeliveryValidation(null);
    fetch(`/next-api/public/cars/${carId}/delivery/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressLat:   deliveryAddress.lat,
        addressLng:   deliveryAddress.lng,
        addressLabel: deliveryAddress.label,
      }),
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() as Promise<DeliveryValidation> : null)
      .then(data => { if (data) setDeliveryValidation(data); })
      .catch(() => {/* ignore abort */})
      .finally(() => setCheckingDelivery(false));
    return () => controller.abort();
  }, [carId, deliveryEnabled, deliveryType, deliveryMode, deliveryAddress]);

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleBook = async () => {
    if (!startISO || !endISO || !available || !priceResult) return;

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
      const selectedLoc = deliveryLocations.find(l => l.id === selectedLocationId);
      let deliveryPayload: Record<string, unknown> = {};
      if (deliveryEnabled && deliveryMode === "delivery") {
        if (deliveryType === "location" && selectedLoc) {
          deliveryPayload = {
            deliveryRequested:  true,
            deliveryAddress:    selectedLoc.address,
            deliveryAddressLat: selectedLoc.lat,
            deliveryAddressLng: selectedLoc.lng,
          };
        } else if (deliveryType === "radius" && deliveryAddress && deliveryValidation?.available) {
          deliveryPayload = {
            deliveryRequested:  true,
            deliveryAddress:    deliveryAddress.label,
            deliveryAddressLat: deliveryAddress.lat,
            deliveryAddressLng: deliveryAddress.lng,
          };
        }
      }
      const res = await fetch("/next-api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          startDateTime: startISO,
          endDateTime:   endISO,
          customerName:  name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          ...deliveryPayload,
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

  const selectedLoc = deliveryLocations.find(l => l.id === selectedLocationId) ?? null;

  const deliveryReady = !deliveryEnabled || deliveryMode === "pickup"
    || (deliveryType === "location" && selectedLocationId !== null)
    || (deliveryType === "radius" && deliveryValidation?.available === true && !checkingDelivery);

  const activeDeliveryFee: number = deliveryEnabled && deliveryMode === "delivery"
    ? deliveryType === "location"
      ? (selectedLoc?.price ?? 0)
      : (deliveryValidation?.available ? (deliveryValidation.fee ?? 0) : 0)
    : 0;

  const canBook      = available === true && priceResult !== null && !checking && !submitting && deliveryReady;
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
            placeholder={labels.pickupPlaceholder}
            onComplete={handleStartComplete}
            locale={locale}
            clearLabel={t.dateTimePicker.clear}
            noSlotsLabel={t.dateTimePicker.noSlots}
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
            placeholder={labels.returnPlaceholder}
            locale={locale}
            clearLabel={t.dateTimePicker.clear}
            noSlotsLabel={t.dateTimePicker.noSlots}
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
          <span className={styles.statusText}>{labels.checking}</span>
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
            <span className={styles.priceTotal}>
              €{(priceResult.totalPrice + activeDeliveryFee).toFixed(2)}
            </span>
            <span className={styles.priceDays}>{priceResult.numberOfDays} {labels.days}</span>
          </div>
          {activeDeliveryFee > 0 && (
            <p className={styles.deliveryFeeNote}>
              + €{activeDeliveryFee.toFixed(2)} {t.booking.delivery.fee}
            </p>
          )}

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

      {/* ── Delivery option ── */}
      {deliveryEnabled && available === true && (
        <div className={styles.deliverySection}>
          <p className={styles.deliveryTitle}>{t.booking.delivery.title}</p>

          {/* Location mode: radio list of locations + pickup */}
          {deliveryType === "location" && (
            <div className={styles.deliveryOptions}>
              <label className={`${styles.deliveryOption} ${deliveryMode === "pickup" ? styles.deliveryOptionSelected : ""}`}>
                <input
                  type="radio" name="delivery-option" value="pickup"
                  checked={deliveryMode === "pickup"}
                  onChange={() => { setDeliveryMode("pickup"); setSelectedLocationId(null); }}
                  className={styles.deliveryOptionRadio}
                />
                <span className={styles.deliveryOptionIcon}>📍</span>
                <span className={styles.deliveryOptionInfo}>
                  <span className={styles.deliveryOptionLabel}>{t.booking.delivery.pickup}</span>
                </span>
              </label>
              {deliveryLocations.map(loc => (
                <label key={loc.id} className={`${styles.deliveryOption} ${selectedLocationId === loc.id ? styles.deliveryOptionSelected : ""}`}>
                  <input
                    type="radio" name="delivery-option" value={loc.id}
                    checked={selectedLocationId === loc.id}
                    onChange={() => { setDeliveryMode("delivery"); setSelectedLocationId(loc.id); }}
                    className={styles.deliveryOptionRadio}
                  />
                  <span className={styles.deliveryOptionIcon}>🚚</span>
                  <span className={styles.deliveryOptionInfo}>
                    <span className={styles.deliveryOptionLabel}>{loc.label}</span>
                    <span className={styles.deliveryOptionAddr}>{loc.address}</span>
                  </span>
                  <span className={styles.deliveryOptionPrice}>
                    {loc.price != null ? `€${loc.price.toFixed(2)}` : t.booking.delivery.free}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Radius mode: toggle + address input */}
          {deliveryType === "radius" && (
            <>
              <div className={styles.deliveryToggle}>
                <button
                  type="button"
                  className={`${styles.deliveryToggleBtn} ${deliveryMode === "pickup" ? styles.deliveryToggleBtnActive : ""}`}
                  onClick={() => { setDeliveryMode("pickup"); setDeliveryAddress(null); setDeliveryValidation(null); }}
                >
                  📍 {t.booking.delivery.pickup}
                </button>
                <button
                  type="button"
                  className={`${styles.deliveryToggleBtn} ${deliveryMode === "delivery" ? styles.deliveryToggleBtnActive : ""}`}
                  onClick={() => setDeliveryMode("delivery")}
                >
                  🚚 {t.booking.delivery.deliver}
                </button>
              </div>
              {deliveryMode === "delivery" && (
                <div className={styles.deliveryAddressWrap}>
                  <AddressAutocomplete
                    value={deliveryAddress}
                    onChange={setDeliveryAddress}
                    placeholder={t.booking.delivery.addressPlaceholder}
                  />
                  {checkingDelivery && (
                    <p className={styles.deliveryStatus}>{t.booking.delivery.checking}</p>
                  )}
                  {!checkingDelivery && deliveryValidation && (
                    <p className={`${styles.deliveryStatus} ${deliveryValidation.available ? styles.deliveryStatusOk : styles.deliveryStatusErr}`}>
                      {deliveryValidation.available
                        ? `✓ ${t.booking.delivery.available}${deliveryValidation.fee != null ? ` · €${deliveryValidation.fee.toFixed(2)}` : ` · ${t.booking.delivery.free}`}`
                        : `✗ ${t.booking.delivery.unavailable}`}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
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
              placeholder={labels.phonePlaceholder}
              locale={locale}
              searchPlaceholder={t.phone.searchPlaceholder}
              noCountriesLabel={t.phone.noCountriesFound}
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

          <p className={styles.requiredNote}>{labels.requiredNote}</p>
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
