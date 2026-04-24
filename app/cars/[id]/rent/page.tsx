"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Car } from "../../data";
import type { RentSchedule } from "../RentCalendar";
import RentTracker from "../RentTracker";
import RentCalendar from "../RentCalendar";
import styles from "./rent.module.css";

export default function RentPage() {
  const { id } = useParams<{ id: string }>();

  const [car,             setCar]             = useState<Car | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [schedules,       setSchedules]       = useState<RentSchedule[]>([]);
  const [usedScheduleIds, setUsedScheduleIds] = useState<string[]>([]);

  const [tick,      setTick]      = useState(0);
  const boundaryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/next-api/cars/${id}`, { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(setCar)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const now = Date.now();
    const boundaries = schedules
      .flatMap(s => [new Date(s.fromDate).getTime(), new Date(s.toDate).getTime()])
      .filter(t => t > now)
      .sort((a, b) => a - b);
    if (!boundaries.length) return;
    const ms = boundaries[0] - now;
    if (boundaryRef.current) clearTimeout(boundaryRef.current);
    boundaryRef.current = setTimeout(() => setTick(t => t + 1), ms + 100);
    return () => { if (boundaryRef.current) clearTimeout(boundaryRef.current); };
  }, [schedules, tick]);

  const activeSchedule = schedules.find(s => {
    const now = Date.now();
    return new Date(s.fromDate).getTime() <= now && now <= new Date(s.toDate).getTime();
  }) ?? null;

  const handleScheduleUpdate = (updated: RentSchedule) =>
    setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));

  const handleScheduleDelete = (deletedId: string) =>
    setSchedules(prev => prev.filter(s => s.id !== deletedId));

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
        activeSchedule={activeSchedule}
        allSchedules={schedules}
        onScheduleUpdate={handleScheduleUpdate}
        onScheduleDelete={handleScheduleDelete}
        onUsedScheduleIdsChange={setUsedScheduleIds}
      />
      <RentCalendar
        car={car}
        onScheduleChange={setSchedules}
        activeScheduleId={activeSchedule?.id}
        excludeScheduleIds={usedScheduleIds}
      />
    </div>
  );
}
