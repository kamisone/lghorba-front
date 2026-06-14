"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AddressAutocomplete, { type SelectedAddress } from "./AddressAutocomplete";
import DateTimePicker, { type DateTimePickerHandle } from "./DateTimePicker";
import { isoToLocalDT, localDTToISO, nowNextSlot } from "@/lib/dateUtils";
import { loadSearchContext } from "@/lib/searchContext";
import styles from "./CarSearchForm.module.css";
import { MapPin, ArrowRight, CalendarDays, Flag, Search } from "lucide-react";

/** Add `hours` to a "YYYY-MM-DDTHH:mm" wall-clock string, preserving the format. */
function addHours(localDT: string, hours: number): string {
  const [datePart, timePart] = localDT.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi]    = timePart.split(":").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi));
  dt.setUTCHours(dt.getUTCHours() + hours);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
}

export interface SearchFormLabels {
  fromLabel:           string;
  toLabel:             string;
  addressLabel:        string;
  addressPlaceholder:  string;
  addressOptional:     string;
  addressHelper:       string;
  searchBtn:           string;
  dateError:           string;
  pickupPlaceholder:   string;
  returnPlaceholder:   string;
  clearLabel:          string;
  noSlotsLabel:        string;
}

interface Props {
  locale:     string;
  labels:     SearchFormLabels;
  businessTz: string;
}

export default function CarSearchForm({ locale, labels, businessTz }: Props) {
  const router = useRouter();

  const defaultStart = addHours(nowNextSlot(businessTz), 2);
  const defaultEnd   = addHours(defaultStart, 24);

  const [startDateTime, setStartDateTime] = useState(defaultStart);
  const [endDateTime,   setEndDateTime]   = useState(defaultEnd);
  const [address,       setAddress]       = useState<SelectedAddress | null>(null);
  const [dateError,     setDateError]     = useState<string | undefined>();

  const endPickerRef = useRef<DateTimePickerHandle>(null);

  // Pre-fill from last search context on mount
  useEffect(() => {
    const ctx = loadSearchContext();
    if (!ctx || new Date(ctx.start) <= new Date()) return;
    setStartDateTime(isoToLocalDT(ctx.start, businessTz));
    setEndDateTime(isoToLocalDT(ctx.end, businessTz));
  }, [businessTz]);

  const validate = useCallback((): boolean => {
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setDateError(labels.dateError);
      return false;
    }
    setDateError(undefined);
    return true;
  }, [startDateTime, endDateTime, labels.dateError]);

  function handleStartChange(v: string) {
    if (!v) return;
    setStartDateTime(v);
    if (new Date(v) >= new Date(endDateTime)) {
      setEndDateTime(addHours(v, 24));
    }
    setDateError(undefined);
  }

  function handleEndChange(v: string) {
    if (!v) return;
    setEndDateTime(v);
    setDateError(undefined);
  }

  function handleStartComplete() {
    setTimeout(() => endPickerRef.current?.openPicker(), 160);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const start = localDTToISO(startDateTime, businessTz);
    const end   = localDTToISO(endDateTime, businessTz);
    const params = new URLSearchParams({ start, end });
    if (address) {
      params.set("lat",     String(address.lat));
      params.set("lng",     String(address.lng));
      params.set("address", address.label);
    }
    router.push(`/${locale}/search?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>

      {/* ── Dates row ── */}
      <div className={styles.datesRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <CalendarDays size={16} strokeWidth={1.75} className={styles.fieldIcon} />
            {labels.fromLabel}
          </label>
          <DateTimePicker
            value={startDateTime}
            onChange={handleStartChange}
            minValue={nowNextSlot(businessTz)}
            placeholder={labels.pickupPlaceholder}
            onComplete={handleStartComplete}
            locale={locale}
            clearLabel={labels.clearLabel}
            noSlotsLabel={labels.noSlotsLabel}
            businessTz={businessTz}
          />
        </div>

        <div className={styles.arrowWrap} aria-hidden="true">
          <span className={styles.arrow}><ArrowRight size={14} strokeWidth={1.75} /></span>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <Flag size={16} strokeWidth={1.75} className={styles.fieldIcon} />
            {labels.toLabel}
          </label>
          <DateTimePicker
            ref={endPickerRef}
            value={endDateTime}
            onChange={handleEndChange}
            minValue={startDateTime}
            placeholder={labels.returnPlaceholder}
            error={dateError}
            locale={locale}
            clearLabel={labels.clearLabel}
            noSlotsLabel={labels.noSlotsLabel}
            businessTz={businessTz}
          />
        </div>
      </div>

      {/* ── Address row ── */}
      <div className={styles.addressRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="search-address">
            <span className={styles.fieldIcon}><MapPin size={16} strokeWidth={1.75} /></span>
            <span className={styles.fieldLabelText}>{labels.addressLabel}</span>
            <span className={styles.optionalBadge}>{labels.addressOptional}</span>
          </label>
          <AddressAutocomplete
            id="search-address"
            value={address}
            onChange={setAddress}
            placeholder={labels.addressPlaceholder}
            required={false}
          />
          <p className={styles.fieldHelper}>{labels.addressHelper}</p>
        </div>
      </div>

      {/* ── Submit ── */}
      <button type="submit" className={styles.searchBtn}>
        <Search size={16} strokeWidth={1.75} className={styles.searchBtnIcon} />
        {labels.searchBtn}
      </button>

    </form>
  );
}
