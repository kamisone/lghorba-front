"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Car } from "./data";
import CarFormModal from "./CarFormModal";
import styles from "./cars.module.css";

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
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const lastMessages = useLastMessages(cars);

  const fetchCars = async () => {
    try {
      const res = await fetch("/next-api/cars", { cache: "no-store" });
      if (res.ok) setCars(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCars(); }, []);

  const handleSaved = (saved: Car) => {
    setCars((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
    });
    setShowForm(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>My Cars</h1>
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>+ Add Car</button>
      </div>

      {loading ? (
        <div className={styles.loadingRow}>
          <span className={styles.loadingSpinner} />
        </div>
      ) : cars.length === 0 ? (
        <p className={styles.empty}>No cars yet. Add your first one!</p>
      ) : (
        <div className={styles.grid}>
          {cars.map((car) => {
            const msg = lastMessages[car.id];
            return (
              <Link key={car.id} href={`/cars/${car.id}`} className={styles.card}>
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
                      <span>🚗</span>
                    </div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <h2 className={styles.carName}>{car.name}</h2>
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
