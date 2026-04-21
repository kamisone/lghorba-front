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

interface LastConsumed {
  inbound: SmsMessage | null;
  outbound: SmsMessage | null;
}

type ActionKey = "open" | "close" | "parking" | "location" | "sleep" | "wake" | "stoplocation" | "network";

const ACTIONS: { key: ActionKey; label: string; icon: string; message: string }[] = [
  { key: "open",         label: "Open Car",      icon: "🔓", message: "open" },
  { key: "close",        label: "Close Car",     icon: "🔒", message: "close" },
  { key: "parking",      label: "Parking",       icon: "🅿️", message: "parking" },
  { key: "location",     label: "Location",      icon: "📍", message: "location" },
  { key: "sleep",        label: "Sleep",         icon: "🌙", message: "sleep" },
  { key: "wake",         label: "Wake",          icon: "⚡", message: "wake" },
  { key: "stoplocation", label: "Stop Location", icon: "🛑", message: "stoplocation" },
  { key: "network",      label: "Network",       icon: "📡", message: "network" },
];

const MAPS_PATTERN = /https?:\/\/\S*(maps\.google|google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com|maps\.apple)\S*/i;

function extractMapsUrl(text: string): string | null {
  const match = text.match(MAPS_PATTERN);
  return match ? match[0] : null;
}

const POLL_INTERVAL = 3000;
const RELEASE_THRESHOLD = 3;

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const car = getCarById(id);

  const storageKey       = `car_last_msg_${id}`;
  const waitingKey       = `car_waiting_action_${id}`;
  const inboundIdAtSendKey = `car_inbound_id_at_send_${id}`;

  const [lastConsumed, setLastConsumed] = useState<LastConsumed | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "null"); } catch { return null; }
  });

  const [waitingAction, setWaitingAction] = useState<ActionKey | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(waitingKey) as ActionKey | null;
  });

  const [sendingAction, setSendingAction] = useState<ActionKey | null>(null);
  const [sendError, setSendError] = useState<ActionKey | null>(null);
  const [releaseClicks, setReleaseClicks] = useState(0);
  const [unlockAvailable, setUnlockAvailable] = useState(false);
  const [imgError, setImgError] = useState(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // stores the inbound message id at the moment of sending, to detect a new response
  const inboundIdAtSendRef = useRef<number | null>(
    typeof window !== "undefined"
      ? Number(localStorage.getItem(inboundIdAtSendKey)) || null
      : null
  );
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearWaiting = useCallback(() => {
    setWaitingAction(null);
    setReleaseClicks(0);
    setUnlockAvailable(false);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    inboundIdAtSendRef.current = null;
    localStorage.removeItem(waitingKey);
    localStorage.removeItem(inboundIdAtSendKey);
  }, [waitingKey, inboundIdAtSendKey]);

  const poll = useCallback(async () => {
    if (!car) return;
    try {
      const res = await fetch(
        `/next-api/sms/last-consumed?to=${encodeURIComponent(car.phoneNumber)}`,
        { cache: "no-store" }
      );
      const data: LastConsumed = await res.json();
      if ("inbound" in data) {
        setLastConsumed(data);
        localStorage.setItem(storageKey, JSON.stringify(data));

        // unblock when a new inbound arrives after the action was sent
        const newInboundId = data.inbound?.id ?? null;
        if (
          inboundIdAtSendRef.current !== null &&
          newInboundId !== null &&
          newInboundId !== inboundIdAtSendRef.current
        ) {
          clearWaiting();
        }
      }
    } catch { /* silent — keep last message */ }
  }, [car, storageKey, clearWaiting]);

  useEffect(() => {
    if (!car) return;
    poll();
    pollingRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [car, poll]);

  useEffect(() => {
    if (waitingAction) {
      setUnlockAvailable(false);
      unlockTimerRef.current = setTimeout(() => setUnlockAvailable(true), 10000);
    }
    return () => { if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current); };
  }, [waitingAction]);

  const handleWaitingClick = () => {
    if (!unlockAvailable) return;
    const next = releaseClicks + 1;
    if (next >= RELEASE_THRESHOLD) clearWaiting();
    else setReleaseClicks(next);
  };

  const sendAction = async (action: (typeof ACTIONS)[number]) => {
    if (!car || sendingAction || waitingAction) return;
    setSendingAction(action.key);
    setSendError(null);
    try {
      await fetch("/next-api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: car.phoneNumber, message: action.message }),
      });
      const currentInboundId = lastConsumed?.inbound?.id ?? null;
      inboundIdAtSendRef.current = currentInboundId;
      localStorage.setItem(waitingKey, action.key);
      localStorage.setItem(inboundIdAtSendKey, String(currentInboundId));
      setWaitingAction(action.key);
    } catch {
      setSendError(action.key);
      setTimeout(() => setSendError(null), 3000);
    } finally {
      setSendingAction(null);
    }
  };

  const isBlocked = sendingAction !== null || waitingAction !== null;

  if (!car) {
    return (
      <div className={styles.notFound}>
        <p>Car not found.</p>
        <Link href="/cars" className={styles.back}>← Back to Cars</Link>
      </div>
    );
  }

  const mapsUrl = lastConsumed?.inbound ? extractMapsUrl(lastConsumed.inbound.message) : null;

  const isAwaitingResponse = (() => {
    if (!lastConsumed?.outbound) return false;
    if (!lastConsumed.inbound) return true;
    return new Date(lastConsumed.outbound.createdAt) > new Date(lastConsumed.inbound.createdAt);
  })();

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
        {ACTIONS.map((action) => {
          const isSending = sendingAction === action.key;
          const isWaiting = waitingAction === action.key;
          const isErr = sendError === action.key;

          return (
            <button
              key={action.key}
              className={`${styles.actionBtn} ${styles[action.key]} ${
                isWaiting ? styles.waiting : ""
              } ${isErr ? styles.err : ""}`}
              onClick={() => isWaiting ? handleWaitingClick() : sendAction(action)}
              disabled={!isWaiting && isBlocked}
            >
              <span className={styles.actionIcon}>{action.icon}</span>
              <span className={styles.actionLabel}>
                {isSending
                  ? "Sending…"
                  : isWaiting
                  ? !unlockAvailable
                    ? "Waiting…"
                    : releaseClicks === 0
                    ? "Tap 3× to unlock"
                    : `${RELEASE_THRESHOLD - releaseClicks} tap${RELEASE_THRESHOLD - releaseClicks > 1 ? "s" : ""} left`
                  : isErr
                  ? "Failed"
                  : action.label}
              </span>
            </button>
          );
        })}
      </div>

      <h2 className={styles.sectionTitle}>
        Last Message
        <span className={styles.pollDot} title="Polling every 3s" />
      </h2>
      <div className={`${styles.messageBox} ${isAwaitingResponse ? styles.messageBoxWaiting : ""}`}>
        {isAwaitingResponse && (
          <div className={styles.awaitingBadge} title="Waiting for car response">
            <span className={styles.awaitingSpinner} />
          </div>
        )}
        {lastConsumed ? (
          <>
            <div className={styles.msgRow}>
              <span className={styles.msgLabel}>Response</span>
              <p className={styles.messageText}>{lastConsumed.inbound?.message ?? "—"}</p>
              {lastConsumed.inbound && (
                <p className={styles.messageMeta}>
                  {new Date(lastConsumed.inbound.createdAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className={styles.msgRow}>
              <span className={styles.msgLabel}>Last command</span>
              <p className={styles.messageText}>{lastConsumed.outbound?.message ?? "—"}</p>
              {lastConsumed.outbound && (
                <p className={styles.messageMeta}>
                  {new Date(lastConsumed.outbound.createdAt).toLocaleString()}
                </p>
              )}
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.mapsBtn}
              >
                Open in Maps
              </a>
            )}
          </>
        ) : (
          <p className={styles.noMessage}>No messages yet.</p>
        )}
      </div>
    </div>
  );
}
