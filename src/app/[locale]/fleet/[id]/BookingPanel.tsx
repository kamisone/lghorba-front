"use client";

import { useEffect } from "react";
import DateTimePicker from "@/components/DateTimePicker";
import PhoneInput from "@/components/PhoneInput";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { getTranslations } from "@/lib/i18n";
import { saveSearchContext } from "@/lib/searchContext";
import { useBookingDates } from "./useBookingDates";
import { useBookingPricing } from "./useBookingPricing";
import { useDeliveryMode, type DeliveryLocationOption } from "./useDeliveryMode";
import { useBookingForm } from "./useBookingForm";
import { nowNextSlot } from "@/lib/dateUtils";
import styles from "./BookingPanel.module.css";

export type { DeliveryLocationOption };

// ── Types ─────────────────────────────────────────────────────────────────────

interface Labels {
  title:            string;
  startDate:        string;
  endDate:          string;
  selectDates:      string;
  available:        string;
  unavailable:      string;
  totalPrice:       string;
  perDay:           string;
  days:             string;
  breakdown:        string;
  baseRate:         string;
  bookNow:          string;
  submitting:       string;
  nameLabel:        string;
  namePlaceholder:  string;
  emailLabel:       string;
  emailPlaceholder: string;
  phoneLabel:       string;
  phonePlaceholder: string;
  dateError:        string;
  minimumOneDay:    string;
  noPriceConfigured: string;
  prefillFromSearch: string;
  prefillLastSearch: string;
  pickupPlaceholder: string;
  returnPlaceholder: string;
  checking:          string;
  requiredNote:      string;
  couponPlaceholder: string;
  discountedTotal:   string;
  dismiss:           string;
}

interface Props {
  carId:              string;
  locale:             string;
  labels:             Labels;
  deliveryEnabled?:   boolean;
  deliveryType?:      "radius" | "location" | null;
  deliveryLocations?: DeliveryLocationOption[];
  urlStart?:          string;
  urlEnd?:            string;
  businessTz?:        string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBreakdownDate(date: string, locale: string) {
  return new Date(date + "T00:00:00Z").toLocaleDateString(locale, {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookingPanel({
  carId,
  locale,
  labels,
  deliveryEnabled   = false,
  deliveryType      = null,
  deliveryLocations = [],
  urlStart          = "",
  urlEnd            = "",
  businessTz        = "Europe/Paris",
}: Props) {
  const t = getTranslations(locale);

  const dates = useBookingDates(urlStart, urlEnd, deliveryEnabled, deliveryType, businessTz);
  const { startDateTime, endDateTime, startISO, endISO, prefillSource, setPrefillSource,
          prefillAddress, setStartDateTime, setEndDateTime, endPickerRef, handleStartComplete } = dates;

  const pricing = useBookingPricing(carId, startISO, endISO, locale, labels.dateError);
  const { available, priceResult, checking, dateError } = pricing;

  const delivery = useDeliveryMode(carId, deliveryEnabled, deliveryType, deliveryLocations, prefillAddress);
  const { deliveryMode, setDeliveryMode, selectedLocationId, setSelectedLocationId,
          deliveryAddress, setDeliveryAddress, deliveryValidation, setDeliveryValidation,
          checkingDelivery, activeDeliveryFee, deliveryReady } = delivery;

  const form = useBookingForm({
    carId, locale, startISO, endISO, available, priceResult,
    deliveryEnabled, deliveryMode, deliveryType, deliveryAddress,
    deliveryValidation, selectedLocationId, deliveryLocations, activeDeliveryFee,
  });
  const { name, setName, email, setEmail, phone, setPhone,
          fieldErrors, setFieldErrors, touched, setTouched,
          submitting, submitError, couponCode, setCouponCode,
          couponResult, setCouponResult, couponChecking, validate, handleBook } = form;

  // Persist valid dates + delivery address to search context
  useEffect(() => {
    if (!startISO || !endISO) return;
    if (new Date(startISO) <= new Date() || new Date(endISO) <= new Date(startISO)) return;
    const addr = deliveryAddress
      ? { lat: deliveryAddress.lat, lng: deliveryAddress.lng, label: deliveryAddress.label }
      : undefined;
    saveSearchContext(startISO, endISO, addr);
  }, [startISO, endISO, deliveryAddress]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const canBook      = available === true && priceResult !== null && !checking && !submitting && deliveryReady;
  const hasNoPricing = priceResult !== null && priceResult.basePricePerDay === null && priceResult.breakdown.length === 0;
  const minStart     = nowNextSlot(businessTz);
  const startDone    = !!startDateTime;
  const endDone      = !!endDateTime;
  const stepState    = !startDone ? 0 : !endDone ? 1 : 2;

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
            businessTz={businessTz}
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
            businessTz={businessTz}
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
            aria-label={labels.dismiss}
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
                    {fmtBreakdownDate(item.startDate, locale)} – {fmtBreakdownDate(item.endDate, locale)}
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
                if (touched.name) setFieldErrors(prev => ({ ...prev, name: validate("name", e.target.value) }));
              }}
              onBlur={() => {
                setTouched(prev => ({ ...prev, name: true }));
                setFieldErrors(prev => ({ ...prev, name: validate("name", name) }));
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
                if (touched.email) setFieldErrors(prev => ({ ...prev, email: validate("email", e.target.value) }));
              }}
              onBlur={() => {
                setTouched(prev => ({ ...prev, email: true }));
                setFieldErrors(prev => ({ ...prev, email: validate("email", email) }));
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
                if (touched.phone) setFieldErrors(prev => ({ ...prev, phone: validate("phone", v) }));
              }}
              onBlur={() => {
                setTouched(prev => ({ ...prev, phone: true }));
                setFieldErrors(prev => ({ ...prev, phone: validate("phone", phone) }));
              }}
            />
            {touched.phone && fieldErrors.phone && (
              <span id="bp-phone-err" className={styles.fieldError} role="alert">{fieldErrors.phone}</span>
            )}
          </div>

          <p className={styles.requiredNote}>{labels.requiredNote}</p>

          {/* ── Coupon code ── */}
          <div className={styles.couponRow}>
            <input
              type="text"
              className={styles.couponInput}
              placeholder={labels.couponPlaceholder}
              value={couponCode}
              onChange={e => { setCouponCode(e.target.value); setCouponResult(null); }}
              autoComplete="off"
              spellCheck={false}
            />
            {couponChecking && <span className={styles.couponSpinner} />}
            {!couponChecking && couponResult && (
              couponResult.valid
                ? <span className={styles.couponOk}>✓ −€{couponResult.discountAmount.toFixed(2)}</span>
                : <span className={styles.couponErr}>{couponResult.error}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Discount total ── */}
      {couponResult?.valid && (
        <div className={styles.discountSummary}>
          <span className={styles.discountLabel}>{labels.discountedTotal}</span>
          <span className={styles.discountTotal}>€{couponResult.finalPrice.toFixed(2)}</span>
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
