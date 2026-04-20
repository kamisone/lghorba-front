"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { getCarById } from "../data";
import styles from "./car-detail.module.css";

interface SmsMessage {
  id: number;
  to: string;
  message: string;
  type: string;
  consumed: boolean;
  createdAt: string;
}

type ActionKey = "open" | "close" | "parking" | "location";

const ACTIONS: { key: ActionKey; label: string; message: string }[] = [
  { key: "open", label: "Open Car", message: "open" },
  { key: "close", label: "Close Car", message: "close" },
  { key: "parking", label: "Open Parking", message: "parking" },
  { key: "location", label: "Get Location", message: "location" },
];

const POLL_INTERVAL = 5000;

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const car = getCarById(id);

  const [lastMessage, setLastMessage] = useState<SmsMessage | null>(null);
  const [loadingAction, setLoadingAction] = useState<ActionKey | null>(null);
  const [actionStatus, setActionStatus] = useState<Record<ActionKey, "idle" | "ok" | "err">>({
    open: "idle",
    close: "idle",
    parking: "idle",
    location: "idle",
  });
  const [imgError, setImgError] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const storageKey = `car_last_msg_${id}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setLastMessage(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, [storageKey]);

  const poll = useCallback(async () => {
    if (!car) return;
    try {
      const res = await fetch(
        `/api/sms?type=inbound&to=${encodeURIComponent(car.phoneNumber)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!data.error) {
        setLastMessage(data as SmsMessage);
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
    } catch {
      /* silent — keep last message */
    }
  }, [car, storageKey]);

  useEffect(() => {
    if (!car) return;
    poll();
    pollingRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [car, poll]);

  const sendAction = async (action: (typeof ACTIONS)[number]) => {
    if (!car || loadingAction) return;
    setLoadingAction(action.key);
    try {
      await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: car.phoneNumber, message: action.message }),
      });
      setActionStatus((s) => ({ ...s, [action.key]: "ok" }));
    } catch {
      setActionStatus((s) => ({ ...s, [action.key]: "err" }));
    } finally {
      setLoadingAction(null);
      setTimeout(() => {
        setActionStatus((s) => ({ ...s, [action.key]: "idle" }));
      }, 2000);
    }
  };

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
      <Link href="/cars" className={styles.back}>← Back to Cars</Link>

      <div className={styles.header}>
        <div className={styles.photoWrapper}>
          {!imgError ? (
            <img
              src={`/assets/cars/${car.id}.jpg`}
              alt={car.name}
              className={styles.photo}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={styles.photoPlaceholder}>🚗</div>
          )}
        </div>
        <div className={styles.info}>
          <h1 className={styles.carName}>{car.name}</h1>
          <p className={styles.immat}>{car.immatriculation}</p>
          <p className={styles.phone}>{car.phoneNumber}</p>
          {car.description && <p className={styles.desc}>{car.description}</p>}
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Actions</h2>
      <div className={styles.actionsGrid}>
        {ACTIONS.map((action) => (
          <button
            key={action.key}
            className={`${styles.actionBtn} ${styles[action.key]} ${
              actionStatus[action.key] === "ok" ? styles.ok : ""
            } ${actionStatus[action.key] === "err" ? styles.err : ""}`}
            onClick={() => sendAction(action)}
            disabled={loadingAction !== null}
          >
            {loadingAction === action.key
              ? "Sending…"
              : actionStatus[action.key] === "ok"
              ? "✓ Sent"
              : actionStatus[action.key] === "err"
              ? "✗ Failed"
              : action.label}
          </button>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>
        Last Message
        <span className={styles.pollDot} title="Polling every 5s" />
      </h2>
      <div className={styles.messageBox}>
        {lastMessage ? (
          <>
            <p className={styles.messageText}>{lastMessage.message}</p>
            <p className={styles.messageMeta}>
              {new Date(lastMessage.createdAt).toLocaleString()}
              {lastMessage.consumed && (
                <span className={styles.consumed}> · consumed</span>
              )}
            </p>
          </>
        ) : (
          <p className={styles.noMessage}>No messages yet.</p>
        )}
      </div>
    </div>
  );
}
