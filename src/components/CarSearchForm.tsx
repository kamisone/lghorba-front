"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AddressAutocomplete, { type SelectedAddress } from "./AddressAutocomplete";
import styles from "./CarSearchForm.module.css";

const LS_KEY = "car_search_context";
const LS_TTL = 7 * 24 * 60 * 60 * 1000;

function nowPlusHours(h: number): { date: string; time: string } {
  const d = new Date(Date.now() + h * 3_600_000);
  return {
    date: d.toISOString().slice(0, 10),
    time: `${String(d.getHours()).padStart(2, "0")}:00`,
  };
}

function isoToDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoToTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
}

interface Props {
  locale:  string;
  labels:  SearchFormLabels;
}

export default function CarSearchForm({ locale, labels }: Props) {
  const router = useRouter();

  const defaultStart = nowPlusHours(2);
  const defaultEnd   = nowPlusHours(26);

  const [startDate, setStartDate] = useState(defaultStart.date);
  const [startTime, setStartTime] = useState(defaultStart.time);
  const [endDate,   setEndDate]   = useState(defaultEnd.date);
  const [endTime,   setEndTime]   = useState(defaultEnd.time);
  const [address,   setAddress]   = useState<SelectedAddress | null>(null);
  const [dateError, setDateError] = useState<string | undefined>();

  // Pre-fill from last search context on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const ctx = JSON.parse(raw) as { start?: string; end?: string; savedAt?: number };
      if (!ctx.start || !ctx.end || !ctx.savedAt) return;
      if (Date.now() - ctx.savedAt > LS_TTL) return;
      if (new Date(ctx.start) <= new Date()) return;
      setStartDate(isoToDate(ctx.start));
      setStartTime(isoToTime(ctx.start));
      setEndDate(isoToDate(ctx.end));
      setEndTime(isoToTime(ctx.end));
    } catch { /* ignore */ }
  }, []);

  const validate = useCallback((): boolean => {
    const start = new Date(`${startDate}T${startTime}`);
    const end   = new Date(`${endDate}T${endTime}`);
    if (end <= start) {
      setDateError(labels.dateError);
      return false;
    }
    setDateError(undefined);
    return true;
  }, [startDate, startTime, endDate, endTime, labels.dateError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const start = new Date(`${startDate}T${startTime}`).toISOString();
    const end   = new Date(`${endDate}T${endTime}`).toISOString();
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

        <div className={styles.arrowWrap} aria-hidden="true">
          <span className={styles.arrow}>→</span>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <span className={styles.fieldIcon}>🏁</span>
            {labels.toLabel}
          </label>
          <div className={styles.datetimeRow}>
            <input
              type="date"
              className={`${styles.dateInput} ${dateError ? styles.inputErr : ""}`}
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDateError(undefined); }}
              required
            />
            <input
              type="time"
              className={`${styles.timeInput} ${dateError ? styles.inputErr : ""}`}
              value={endTime}
              onChange={(e) => { setEndTime(e.target.value); setDateError(undefined); }}
              required
            />
          </div>
          {dateError && <p className={styles.errMsg}>{dateError}</p>}
        </div>
      </div>

      {/* ── Address row ── */}
      <div className={styles.addressRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="search-address">
            <span className={styles.fieldIcon}>📍</span>
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
        <span className={styles.searchBtnIcon}>🔍</span>
        {labels.searchBtn}
      </button>

    </form>
  );
}
