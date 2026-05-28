"use client";

import {
  forwardRef, useCallback, useEffect,
  useImperativeHandle, useRef, useState,
} from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { todayStr } from "@/lib/dateUtils";
import styles from "./DateTimePicker.module.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function buildDayLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // Monday=1 … Sunday=7 (ISO week order)
  return [1, 2, 3, 4, 5, 6, 7].map(dow => {
    // 2024-01-01 was a Monday; add (dow-1) days
    const d = new Date(Date.UTC(2024, 0, dow));
    return fmt.format(d).replace(/\.$/, ""); // strip trailing period (some locales)
  });
}

function buildMonthNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, i) =>
    fmt.format(new Date(Date.UTC(2024, i, 1))),
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function triggerDateStr(value: string, locale: string): string {
  if (!value || value.length < 10) return "";
  const [y, mo, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString(locale, {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

function triggerTimeStr(value: string): string {
  return value.length >= 16 ? value.slice(11, 16) : "";
}

// ── Public handle ─────────────────────────────────────────────────────────────

export interface DateTimePickerHandle {
  openPicker: () => void;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (v: string) => void;
  minValue?: string;
  label?: string;
  error?: string;
  placeholder?: string;
  onComplete?: () => void;
  locale?: string;
  clearLabel?: string;
  noSlotsLabel?: string;
  businessTz?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

const DateTimePicker = forwardRef<DateTimePickerHandle, Props>(function DateTimePicker(
  { value, onChange, minValue, label, error, placeholder = "Select date & time", onComplete,
    locale = "en", clearLabel = "Clear", noSlotsLabel = "No available time slots for this date.",
    businessTz = "UTC" },
  ref,
) {
  const DAY_LABELS  = buildDayLabels(locale);
  const MONTH_NAMES = buildMonthNames(locale);
  const [open,        setOpen]        = useState(false);
  const [step,        setStep]        = useState<"date" | "time">("date");
  const [viewYear,    setViewYear]    = useState(() => new Date().getFullYear());
  const [viewMonth,   setViewMonth]   = useState(() => new Date().getMonth());
  const [pendingDate, setPendingDate] = useState("");

  // Single ref on the trigger+popup wrapper – used for outside-click detection.
  const wrapRef = useRef<HTMLDivElement>(null);

  const today        = todayStr(businessTz);
  const minDate      = minValue ? minValue.slice(0, 10) : today;
  const minTime      = minValue ? minValue.slice(11, 16) : undefined;
  const selectedDate = value.slice(0, 10) || "";
  const selectedTime = value.slice(11, 16) || "";

  // ── Open ─────────────────────────────────────────────────────────────────────

  const openPicker = useCallback(() => {
    const base = value || minValue || new Date().toISOString();
    const d    = new Date(base);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setPendingDate(value.slice(0, 10) || "");
    setStep("date");
    setOpen(true);
  }, [value, minValue]);

  useImperativeHandle(ref, () => ({ openPicker }), [openPicker]);

  // ── Close handlers ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const firstDow  = new Date(viewYear, viewMonth, 1).getDay();
  const startOff  = (firstDow + 6) % 7;
  const daysInMon = new Date(viewYear, viewMonth + 1, 0).getDate();

  type Cell = { ymd: string; day: number } | null;
  const cells: Cell[] = [
    ...Array<null>(startOff).fill(null),
    ...Array.from({ length: daysInMon }, (_, i) => ({
      ymd: toYMD(viewYear, viewMonth, i + 1),
      day: i + 1,
    })),
  ];
  while (cells.length % 7) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // ── Pick handlers ────────────────────────────────────────────────────────────

  function pickDate(ymd: string) {
    setPendingDate(ymd);
    setStep("time");
  }

  function pickTime(t: string) {
    onChange(`${pendingDate}T${t}`);
    setOpen(false);
    onComplete?.();
  }

  // ── Time slot filtering ──────────────────────────────────────────────────────

  const filteredSlots = TIME_SLOTS.filter((t) => {
    if (pendingDate > minDate) return true;
    if (pendingDate < minDate) return false;
    return !minTime || t > minTime;
  });

  const pendingLabel = pendingDate
    ? new Date(pendingDate + "T00:00:00Z").toLocaleDateString(locale, {
        weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      })
    : "";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}

      {/* triggerWrap is position:relative — the popup is absolute inside it */}
      <div className={styles.triggerWrap} ref={wrapRef}>

        <button
          type="button"
          className={[
            styles.trigger,
            error ? styles.triggerError : "",
            open   ? styles.triggerOpen  : "",
          ].filter(Boolean).join(" ")}
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CalendarDays size={16} strokeWidth={1.75} className={styles.calIcon} />

          {value ? (
            <span className={styles.triggerValue}>
              <span className={styles.triggerDate}>{triggerDateStr(value, locale)}</span>
              <span className={styles.triggerSep} aria-hidden="true" />
              <span className={styles.triggerTime}>{triggerTimeStr(value)}</span>
            </span>
          ) : (
            <span className={styles.triggerPlaceholder}>{placeholder}</span>
          )}
          <ChevronDown size={14} strokeWidth={1.75} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
        </button>

        {/* Popup – absolutely anchored below the trigger */}
        {open && (
          <div
            className={styles.popup}
            role="dialog"
            aria-modal="false"
            aria-label="Date and time picker"
          >
            {step === "date" && (
              <>
                <div className={styles.calNav}>
                  <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">
                    <ChevronLeft size={16} strokeWidth={1.75} />
                  </button>
                  <span className={styles.monthYear}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                  <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="Next month">
                    <ChevronRight size={16} strokeWidth={1.75} />
                  </button>
                </div>

                <div className={styles.dayRow}>
                  {DAY_LABELS.map(d => <span key={d} className={styles.dayLabel}>{d}</span>)}
                </div>

                <div className={styles.dayGrid}>
                  {cells.map((cell, i) => {
                    if (!cell) return <span key={`gap-${i}`} aria-hidden="true" />;
                    const disabled = cell.ymd < minDate;
                    const isToday  = cell.ymd === today;
                    const active   = cell.ymd === selectedDate || cell.ymd === pendingDate;
                    return (
                      <button
                        key={cell.ymd}
                        type="button"
                        disabled={disabled}
                        onClick={() => pickDate(cell.ymd)}
                        aria-pressed={active}
                        aria-label={cell.ymd}
                        className={[
                          styles.dayBtn,
                          disabled && styles.dayDisabled,
                          isToday && !active && styles.dayToday,
                          active && styles.dayActive,
                        ].filter(Boolean).join(" ")}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>

                {value && (
                  <div className={styles.calFooter}>
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => { onChange(""); setOpen(false); }}
                    >
                      {clearLabel}
                    </button>
                  </div>
                )}
              </>
            )}

            {step === "time" && (
              <>
                <div className={styles.timeHeader}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setStep("date")}
                    aria-label="Back to calendar"
                  >
                    <ArrowLeft size={16} strokeWidth={1.75} />
                  </button>
                  <span className={styles.pendingLabel}>{pendingLabel}</span>
                </div>

                {filteredSlots.length === 0 ? (
                  <p className={styles.noSlots}>{noSlotsLabel}</p>
                ) : (
                  <div className={styles.timeGrid}>
                    {filteredSlots.map(t => (
                      <button
                        key={t}
                        type="button"
                        className={[
                          styles.timeSlot,
                          t === selectedTime && pendingDate === selectedDate && styles.timeActive,
                        ].filter(Boolean).join(" ")}
                        onClick={() => pickTime(t)}
                        aria-pressed={t === selectedTime && pendingDate === selectedDate}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {error && <span className={styles.errorHint}>{error}</span>}
    </div>
  );
});

export default DateTimePicker;
