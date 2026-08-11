"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CalendarBooking, Car } from "@/components/admin/fleet/data";
import RentTracker from "@/components/admin/fleet/RentTracker";
import RentCalendar from "@/components/admin/fleet/RentCalendar";
import styles from "./rent.module.css";

export default function RentPage() {
  const { id } = useParams<{ id: string }>();

  const [car,            setCar]            = useState<Car | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [bookings,       setBookings]       = useState<CalendarBooking[]>([]);
  const [usedBookingIds, setUsedBookingIds] = useState<string[]>([]);
  const [endedBookingIds, setEndedBookingIds] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/next-api/cars/${id}`, { cache: "no-store" })
      .then(res => res.ok ? res.json() : null)
      .then(setCar)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch(`/next-api/bookings/calendar?carId=${id}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(setBookings)
      .catch(() => {});
  }, [id]);

  const handleBookingUpdate = (updated: CalendarBooking) =>
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));

  const handleBookingDelete = (deletedId: string) =>
    setBookings(prev => prev.filter(b => b.id !== deletedId));

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
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
      <RentTracker
        car={car}
        onBookingUpdate={handleBookingUpdate}
        onBookingDelete={handleBookingDelete}
        onUsedBookingIdsChange={setUsedBookingIds}
        onEndedBookingIdsChange={setEndedBookingIds}
      />
      <RentCalendar
        car={car}
        bookings={bookings}
        excludeBookingIds={usedBookingIds}
        endedBookingIds={endedBookingIds}
        onUpdate={handleBookingUpdate}
        onDelete={handleBookingDelete}
      />
    </div>
  );
}
