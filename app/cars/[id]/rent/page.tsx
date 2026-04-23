"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { Car } from "../../data";
import type { RentSchedule } from "../RentCalendar";
import RentTracker from "../RentTracker";
import RentCalendar from "../RentCalendar";
import styles from "./rent.module.css";

interface SmsMessage {
  id: number;
  message: string;
  createdAt: string;
}

interface LastConsumed {
  inbound: SmsMessage | null;
  outbound: SmsMessage | null;
}

const POLL_INTERVAL = 3000;

export default function RentPage() {
  const { id } = useParams<{ id: string }>();
  const storageKey = `car_last_msg_${id}`;

  const [car,          setCar]          = useState<Car | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [schedules,    setSchedules]    = useState<RentSchedule[]>([]);
  const [lastConsumed, setLastConsumed] = useState<LastConsumed | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "null"); } catch { return null; }
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/next-api/cars/${id}`, { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(setCar)
      .finally(() => setLoading(false));
  }, [id]);

  const poll = useCallback(async () => {
    if (!car) return;
    try {
      const res = await fetch(`/next-api/sms/last-consumed?to=${encodeURIComponent(car.phoneNumber)}`, { cache: "no-store" });
      const data: LastConsumed = await res.json();
      if ("inbound" in data) {
        setLastConsumed(data);
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
    } catch { /* silent */ }
  }, [car, storageKey]);

  useEffect(() => {
    if (!car) return;
    poll();
    pollingRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [car, poll]);

  const isScheduleActive = schedules.some(s => {
    const now = Date.now();
    return new Date(s.fromDate).getTime() <= now && now <= new Date(s.toDate).getTime();
  });

  if (loading) {
    return (
      <div className={styles.page}>
        <Link href={`/cars/${id}`} className={styles.back}>← Back to car</Link>
        <div className={styles.loadingRow}><span className={styles.loadingSpinner} /></div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className={styles.notFound}>
        <p>Car not found.</p>
        <Link href="/cars" className={styles.back}>← Back to Cars</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={`/cars/${car.id}`} className={styles.back}>← Back to {car.name}</Link>

      <div className={styles.carHeader}>
        <h1 className={styles.carName}>{car.name}</h1>
        <p className={styles.immat}>{car.immatriculation}</p>
      </div>

      <RentTracker
        car={car}
        lastConsumed={lastConsumed}
        isScheduleActive={isScheduleActive}
      />
      <RentCalendar car={car} onScheduleChange={setSchedules} />
    </div>
  );
}
