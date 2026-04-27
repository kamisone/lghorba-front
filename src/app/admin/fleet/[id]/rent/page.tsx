"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Car } from "@/components/admin/data";
import type { RentSchedule } from "@/components/admin/RentCalendar";
import RentTracker from "@/components/admin/RentTracker";
import RentCalendar from "@/components/admin/RentCalendar";
import styles from "./rent.module.css";

export default function RentPage() {
  const { id } = useParams<{ id: string }>();

  const [car,             setCar]             = useState<Car | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [schedules,        setSchedules]        = useState<RentSchedule[]>([]);
  const [usedScheduleIds,  setUsedScheduleIds]  = useState<string[]>([]);
  const [endedScheduleIds, setEndedScheduleIds] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/next-api/cars/${id}`, { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(setCar)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch(`/next-api/cars/${id}/rent-schedules`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(setSchedules)
      .catch(() => {});
  }, [id]);

  const handleScheduleAdd    = (saved: RentSchedule) =>
    setSchedules(prev => [...prev, saved]);

  const handleScheduleUpdate = (updated: RentSchedule) =>
    setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));

  const handleScheduleDelete = (deletedId: string) =>
    setSchedules(prev => prev.filter(s => s.id !== deletedId));

  if (loading) {
    return (
      <div className={styles.page}>
        <Link href={`/admin/fleet/${id}`} className={styles.back}>← Back to car</Link>
        <div className={styles.loadingRow}><span className={styles.loadingSpinner} /></div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className={styles.notFound}>
        <p>Car not found.</p>
        <Link href="/admin/fleet" className={styles.back}>← Back to Fleet</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={`/admin/fleet/${car.id}`} className={styles.back}>← Back to {car.name}</Link>

      <div className={styles.carHeader}>
        <h1 className={styles.carName}>{car.name}</h1>
        <p className={styles.immat}>{car.immatriculation}</p>
      </div>

      <RentTracker
        car={car}
        onScheduleUpdate={handleScheduleUpdate}
        onScheduleDelete={handleScheduleDelete}
        onUsedScheduleIdsChange={setUsedScheduleIds}
        onEndedScheduleIdsChange={setEndedScheduleIds}
      />
      <RentCalendar
        car={car}
        schedules={schedules}
        excludeScheduleIds={usedScheduleIds}
        endedScheduleIds={endedScheduleIds}
        onAdd={handleScheduleAdd}
        onUpdate={handleScheduleUpdate}
        onDelete={handleScheduleDelete}
      />
    </div>
  );
}
