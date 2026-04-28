"use client";

import { useRef, useState } from "react";
import styles from "./DateTimeInput.module.css";

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

interface Props {
  value: string;       // YYYY-MM-DDTHH:mm or ""
  onChange: (v: string) => void;
  minValue?: string;   // minimum YYYY-MM-DDTHH:mm for filtering time slots
  label?: string;
  error?: string;
}

export default function DateTimeInput({ value, onChange, minValue, label, error }: Props) {
  const [dd,   setDd]   = useState(() => value.slice(8, 10)  || "");
  const [mo,   setMo]   = useState(() => value.slice(5, 7)   || "");
  const [yyyy, setYyyy] = useState(() => value.slice(0, 4)   || "");
  const [time, setTime] = useState(() => value.slice(11, 16) || "");

  const moRef   = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);

  function emit(d: string, m: string, y: string, t: string) {
    if (d.length === 2 && m.length === 2 && y.length === 4 && t) {
      onChange(`${y}-${m}-${d}T${t}`);
    } else {
      onChange("");
    }
  }

  function handleDd(raw: string) {
    const v = raw.replace(/\D/g, "").slice(0, 2);
    setDd(v);
    if (v.length === 2) moRef.current?.focus();
    emit(v, mo, yyyy, time);
  }

  function handleMo(raw: string) {
    const v = raw.replace(/\D/g, "").slice(0, 2);
    setMo(v);
    if (v.length === 2) yyyyRef.current?.focus();
    emit(dd, v, yyyy, time);
  }

  function handleYyyy(raw: string) {
    const v = raw.replace(/\D/g, "").slice(0, 4);
    setYyyy(v);
    emit(dd, mo, v, time);
  }

  function handleTime(v: string) {
    setTime(v);
    emit(dd, mo, yyyy, v);
  }

  const currentDate =
    dd.length === 2 && mo.length === 2 && yyyy.length === 4
      ? `${yyyy}-${mo}-${dd}`
      : "";

  // Filter time slots: on same date as minValue, only show slots after minValue's time
  const minSlotTime =
    minValue && currentDate && currentDate === minValue.slice(0, 10)
      ? minValue.slice(11, 16)
      : undefined;

  const filteredSlots = TIME_SLOTS.filter((t) => !minSlotTime || t > minSlotTime);

  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={`${styles.inputs} ${error ? styles.inputsError : ""}`}>
        <input
          type="text"
          inputMode="numeric"
          className={styles.seg}
          placeholder="dd"
          value={dd}
          maxLength={2}
          onChange={(e) => handleDd(e.target.value)}
        />
        <span className={styles.sep}>/</span>
        <input
          ref={moRef}
          type="text"
          inputMode="numeric"
          className={styles.seg}
          placeholder="mm"
          value={mo}
          maxLength={2}
          onChange={(e) => handleMo(e.target.value)}
        />
        <span className={styles.sep}>/</span>
        <input
          ref={yyyyRef}
          type="text"
          inputMode="numeric"
          className={`${styles.seg} ${styles.segYear}`}
          placeholder="yyyy"
          value={yyyy}
          maxLength={4}
          onChange={(e) => handleYyyy(e.target.value)}
        />
        <span className={styles.timeSep} />
        <select
          className={styles.timeSelect}
          value={time}
          onChange={(e) => handleTime(e.target.value)}
        >
          <option value="">--:--</option>
          {filteredSlots.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
