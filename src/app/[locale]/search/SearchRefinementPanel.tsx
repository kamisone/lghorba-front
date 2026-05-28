"use client";

import { useCallback, useId, useState } from "react";
import { CalendarDays, MapPin, Search, ArrowRight } from "lucide-react";
import AddressAutocomplete, { type SelectedAddress } from "@/components/AddressAutocomplete";
import { isoToLocalParts, localPartsToUTC } from "@/lib/dateUtils";
import styles from "./SearchRefinementPanel.module.css";

export interface RefinementLabels {
  fromLabel:          string;
  toLabel:            string;
  addressLabel:       string;
  addressPlaceholder: string;
  addressOptional:    string;
  searchBtn:          string;
  searching:          string;
  dateError:          string;
  anyLocation:        string;
  modifySearch:       string;
}

interface Props {
  initialStart:   string;
  initialEnd:     string;
  initialAddress: SelectedAddress | null;
  labels:         RefinementLabels;
  loading:        boolean;
  onSearch:       (start: string, end: string, address: SelectedAddress | null) => void;
}

function fmtShort(date: string, time: string): string {
  if (!date) return "–";
  const d = new Date(`${date}T${time || "00:00"}`);
  return (
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
    (time ? ` ${time}` : "")
  );
}

export default function SearchRefinementPanel({
  initialStart,
  initialEnd,
  initialAddress,
  labels,
  loading,
  onSearch,
}: Props) {
  const startParts = initialStart ? isoToLocalParts(initialStart) : { date: "", time: "" };
  const endParts   = initialEnd   ? isoToLocalParts(initialEnd)   : { date: "", time: "" };

  const [startDate, setStartDate] = useState(startParts.date);
  const [startTime, setStartTime] = useState(startParts.time);
  const [endDate,   setEndDate]   = useState(endParts.date);
  const [endTime,   setEndTime]   = useState(endParts.time);
  const [address,   setAddress]   = useState<SelectedAddress | null>(initialAddress);
  const [dateError, setDateError] = useState<string | undefined>();
  const [expanded,  setExpanded]  = useState(false);

  const formId = useId();

  const collapsedSummary = [
    `${fmtShort(startDate, startTime)} → ${fmtShort(endDate, endTime)}`,
    address ? address.label.split(",")[0] : labels.anyLocation,
  ].join("  ·  ");

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
    setExpanded(false);
    onSearch(
      localPartsToUTC(startDate, startTime),
      localPartsToUTC(endDate, endTime),
      address,
    );
  };

  return (
    <div className={styles.panel}>

      {/* ── Mobile only: collapsed summary bar ── */}
      <button
        type="button"
        className={styles.collapsedBar}
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls={formId}
      >
        <span className={styles.collapsedSummary}>{collapsedSummary}</span>
        <span className={`${styles.chevron} ${expanded ? styles.chevronUp : ""}`} aria-hidden>▾</span>
      </button>

      {/* ── Form (always visible on desktop; drawer on mobile) ── */}
      <form
        id={formId}
        onSubmit={handleSubmit}
        className={`${styles.form} ${expanded ? styles.formExpanded : ""}`}
        noValidate
      >
        <div className={styles.fieldsRow}>

          {/* ── Pick-up ── */}
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}><CalendarDays size={16} strokeWidth={1.75} /> {labels.fromLabel}</span>
            <div className={styles.datetimeRow}>
              <input
                type="date"
                className={styles.dateInput}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
              />
              <input
                type="time"
                className={styles.timeInput}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <span className={styles.arrow} aria-hidden><ArrowRight size={14} strokeWidth={1.75} /></span>

          {/* ── Return ── */}
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>🏁 {labels.toLabel}</span>
            <div className={styles.datetimeRow}>
              <input
                type="date"
                className={`${styles.dateInput} ${dateError ? styles.inputErr : ""}`}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setDateError(undefined); }}
                required
              />
              <input
                type="time"
                className={`${styles.timeInput} ${dateError ? styles.inputErr : ""}`}
                value={endTime}
                onChange={e => { setEndTime(e.target.value); setDateError(undefined); }}
                required
              />
            </div>
            {dateError && <p className={styles.errMsg}>{dateError}</p>}
          </div>

          {/* ── Address ── */}
          <div className={`${styles.fieldGroup} ${styles.addressField}`}>
            <span className={styles.fieldLabel}>
              <MapPin size={16} strokeWidth={1.75} /> {labels.addressLabel}
              <span className={styles.optionalBadge}>{labels.addressOptional}</span>
            </span>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              placeholder={labels.addressPlaceholder}
              required={false}
            />
          </div>

          {/* ── Search button ── */}
          <button
            type="submit"
            className={styles.searchBtn}
            disabled={loading}
            aria-busy={loading}
          >
            {loading
              ? <span className={styles.spinner} aria-hidden />
              : <span aria-hidden><Search size={16} strokeWidth={1.75} /></span>}
            <span className={styles.searchBtnLabel}>
              {loading ? labels.searching : labels.searchBtn}
            </span>
          </button>

        </div>
      </form>
    </div>
  );
}
