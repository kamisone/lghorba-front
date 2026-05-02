"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import AddressAutocomplete, { type SelectedAddress } from "./AddressAutocomplete";
import styles from "./CarSearchForm.module.css";

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowPlusHours(h: number): { date: string; time: string } {
  const d = new Date(Date.now() + h * 3_600_000);
  return {
    date: d.toISOString().slice(0, 10),
    time: `${String(d.getHours()).padStart(2, "0")}:00`,
  };
}

// ── Labels type ───────────────────────────────────────────────────────────────

export interface SearchFormLabels {
  eyebrow:             string;
  title:               string;
  fromLabel:           string;
  toLabel:             string;
  addressLabel:        string;
  addressPlaceholder:  string;
  searchBtn:           string;
  dateError:           string;
  addressRequired:     string;
  selectFromList:      string;
}

interface Props {
  locale:  string;
  labels:  SearchFormLabels;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CarSearchForm({ locale, labels }: Props) {
  const router = useRouter();

  const defaultStart = nowPlusHours(2);
  const defaultEnd   = nowPlusHours(26);

  const [startDate, setStartDate] = useState(defaultStart.date);
  const [startTime, setStartTime] = useState(defaultStart.time);
  const [endDate,   setEndDate]   = useState(defaultEnd.date);
  const [endTime,   setEndTime]   = useState(defaultEnd.time);
  const [address,   setAddress]   = useState<SelectedAddress | null>(null);
  const [errors,    setErrors]    = useState<{ date?: string; address?: string }>({});

  const validate = useCallback((): boolean => {
    const errs: typeof errors = {};
    const start = new Date(`${startDate}T${startTime}`);
    const end   = new Date(`${endDate}T${endTime}`);
    if (end <= start) errs.date    = labels.dateError;
    if (!address)     errs.address = labels.addressRequired;
    else if (false)   errs.address = labels.selectFromList; // guard for typed-but-not-selected
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [startDate, startTime, endDate, endTime, address, labels]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const start = new Date(`${startDate}T${startTime}`).toISOString();
    const end   = new Date(`${endDate}T${endTime}`).toISOString();
    const params = new URLSearchParams({
      start:   start,
      end:     end,
      lat:     String(address!.lat),
      lng:     String(address!.lng),
      address: address!.label,
    });
    router.push(`/${locale}/search?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.fields}>

        {/* From */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <span className={styles.fieldIcon}>📅</span>
            {labels.fromLabel}
          </label>
          <div className={styles.datetimeRow}>
            <input
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <input
              type="time"
              className={styles.timeInput}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Separator arrow */}
        <div className={styles.arrow} aria-hidden="true">→</div>

        {/* To */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <span className={styles.fieldIcon}>🏁</span>
            {labels.toLabel}
          </label>
          <div className={styles.datetimeRow}>
            <input
              type="date"
              className={`${styles.dateInput} ${errors.date ? styles.inputErr : ""}`}
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setErrors((p) => ({ ...p, date: undefined })); }}
              required
            />
            <input
              type="time"
              className={`${styles.timeInput} ${errors.date ? styles.inputErr : ""}`}
              value={endTime}
              onChange={(e) => { setEndTime(e.target.value); setErrors((p) => ({ ...p, date: undefined })); }}
              required
            />
          </div>
          {errors.date && <p className={styles.errMsg}>{errors.date}</p>}
        </div>

        {/* Address */}
        <div className={`${styles.fieldGroup} ${styles.fieldGroupAddress}`}>
          <label className={styles.fieldLabel} htmlFor="search-address">
            <span className={styles.fieldIcon}>📍</span>
            {labels.addressLabel}
          </label>
          <AddressAutocomplete
            id="search-address"
            value={address}
            onChange={(a) => { setAddress(a); setErrors((p) => ({ ...p, address: undefined })); }}
            placeholder={labels.addressPlaceholder}
            required
            error={errors.address}
          />
        </div>

      </div>

      <button type="submit" className={styles.searchBtn}>
        <span className={styles.searchBtnIcon}>🔍</span>
        {labels.searchBtn}
      </button>
    </form>
  );
}
