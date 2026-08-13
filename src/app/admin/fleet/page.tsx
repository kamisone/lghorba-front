"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import type { Car } from "@/components/admin/fleet/data";
import CarFormModal from "@/components/admin/fleet/CarFormModal";
import { api } from "@/lib/api";
import styles from "./cars.module.css";
import { Car as CarIcon } from "lucide-react";

const CARS_KEY = "admin:cars";
const fetchCars = () => api.admin.cars.list() as Promise<Car[]>;

interface SmsMessage {
  id: number;
  message: string;
  createdAt: string;
}

interface LastConsumed {
  inbound: SmsMessage | null;
  outbound: SmsMessage | null;
}

function useLastMessages(cars: Car[]) {
  const [messages, setMessages] = useState<Record<string, LastConsumed | null>>({});

  useEffect(() => {
    if (cars.length === 0) return;
    const cached: Record<string, LastConsumed | null> = {};
    for (const car of cars) {
      try { cached[car.id] = JSON.parse(localStorage.getItem(`car_last_msg_${car.id}`) ?? "null"); } catch { cached[car.id] = null; }
    }
    setMessages(cached);

    Promise.all(
      cars.map(async (car) => {
        try {
          const res = await fetch(`/next-api/sms/last-consumed?to=${encodeURIComponent(car.phoneNumber)}`, { cache: "no-store" });
          const data: LastConsumed = await res.json();
          if ("inbound" in data) {
            localStorage.setItem(`car_last_msg_${car.id}`, JSON.stringify(data));
            return { id: car.id, data };
          }
        } catch { /* keep cached */ }
        return null;
      })
    ).then((results) => {
      const updates: Record<string, LastConsumed> = {};
      for (const r of results) { if (r) updates[r.id] = r.data; }
      if (Object.keys(updates).length > 0) setMessages((prev) => ({ ...prev, ...updates }));
    });
  }, [cars]);

  return messages;
}

export default function CarsPage() {
  // SWR keeps this cached across navigations — revisiting /admin/fleet
  // shows the last-known list instantly while revalidating in the
  // background, instead of re-fetching from scratch and re-showing the
  // loading state every single time.
  const { data: cars, isLoading, mutate } = useSWR<Car[]>(CARS_KEY, fetchCars);
  const [showForm, setShowForm] = useState(false);
  const lastMessages = useLastMessages(cars ?? []);

  const handleSaved = (saved: Car) => {
    mutate((prev) => {
      const list = prev ?? [];
      const exists = list.find((c) => c.id === saved.id);
      return exists ? list.map((c) => (c.id === saved.id ? saved : c)) : [...list, saved];
    }, { revalidate: false });
    setShowForm(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Rental cars</h1>
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>+ Add Car</button>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonPhoto} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} style={{ width: "70%" }} />
                <div className={styles.skeletonLine} style={{ width: "45%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : !cars || cars.length === 0 ? (
        <p className={styles.empty}>No cars yet. Add your first one!</p>
      ) : (
        <div className={styles.grid}>
          {cars.map((car) => {
            const msg = lastMessages[car.id];
            return (
              <Link key={car.id} href={`/admin/fleet/${car.id}`} className={styles.card}>
                <div className={styles.photoWrapper}>
                  {car.photo ? (
                    <img
                      src={`/next-api/cars/${car.id}/photo`}
                      alt={car.name}
                      className={styles.photo}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className={styles.photoPlaceholder}>
                      <span><CarIcon size={16} strokeWidth={1.75} /></span>
                    </div>
                  )}
                  {car.isCurrentlyRented && car.currentRentEnd ? (
                    <span className={`${styles.bookingBadge} ${styles.bookingBadgeActive}`}>
                      Return {new Date(car.currentRentEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  ) : car.nextBookingStart ? (
                    <span className={`${styles.bookingBadge} ${styles.bookingBadgeNext}`}>
                      Next {new Date(car.nextBookingStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  ) : !car.isCurrentlyRented ? (
                    <span className={`${styles.bookingBadge} ${styles.bookingBadgeIdle}`}>
                      Available
                    </span>
                  ) : null}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.carNameRow}>
                    <h2 className={styles.carName}>{car.name}</h2>
                    {car.isCurrentlyRented && (
                      <span className={styles.rentingBadge}>🔑 Renting</span>
                    )}
                    {car.isTrackingActive && (
                      <span className={styles.trackingBadge} title="Tracking active">
                        <span className={styles.trackingDot} />
                        GPS
                      </span>
                    )}
                  </div>
                  <p className={styles.immat}>{car.immatriculation}</p>
                  {msg?.inbound ? (
                    <div className={styles.lastMsg}>
                      <span className={styles.lastMsgText}>{msg.inbound.message}</span>
                      <span className={styles.lastMsgTime}>{new Date(msg.inbound.createdAt).toLocaleString()}</span>
                    </div>
                  ) : (
                    <p className={styles.desc}>No messages yet</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && (
        <CarFormModal onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}
