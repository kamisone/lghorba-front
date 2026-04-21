"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CARS } from "./data";
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

function useLastMessages() {
  const [messages, setMessages] = useState<Record<string, LastConsumed | null>>({});

  useEffect(() => {
    const result: Record<string, LastConsumed | null> = {};
    for (const car of CARS) {
      const stored = localStorage.getItem(`car_last_msg_${car.id}`);
      try {
        result[car.id] = stored ? JSON.parse(stored) : null;
      } catch {
        result[car.id] = null;
      }
    }
    setMessages(result);
  }, []);

  return messages;
}

export default function CarsPage() {
  const lastMessages = useLastMessages();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>My Cars</h1>
      <div className={styles.grid}>
        {CARS.map((car) => {
          const msg = lastMessages[car.id];
          return (
            <Link key={car.id} href={`/cars/${car.id}`} className={styles.card}>
              <div className={styles.photoWrapper}>
                <img
                  src={`/assets/cars/${car.id}.jpg`}
                  alt={car.name}
                  className={styles.photo}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = "flex";
                  }}
                />
                <div className={styles.photoPlaceholder} style={{ display: "none" }}>
                  <span>🚗</span>
                </div>
              </div>
              <div className={styles.cardBody}>
                <h2 className={styles.carName}>{car.name}</h2>
                <p className={styles.immat}>{car.immatriculation}</p>
                {msg?.inbound ? (
                  <div className={styles.lastMsg}>
                    <span className={styles.lastMsgText}>{msg.inbound.message}</span>
                    <span className={styles.lastMsgTime}>
                      {new Date(msg.inbound.createdAt).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <p className={styles.desc}>No messages yet</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
