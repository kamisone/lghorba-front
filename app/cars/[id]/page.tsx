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

type ActionKey = "open" | "close" | "parking" | "location" | "sleep" | "wake";

const ACTIONS: { key: ActionKey; label: string; message: string }[] = [
  { key: "open", label: "Open Car", message: "open" },
  { key: "close", label: "Close Car", message: "close" },
  { key: "parking", label: "Open Parking", message: "parking" },
  { key: "location", label: "Get Location", message: "location" },
  { key: "sleep", label: "Sleep", message: "sleep" },
  { key: "wake", label: "Wake", message: "wake" },
];

const MAPS_PATTERN = /https?:\/\/\S*(maps\.google|google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com|maps\.apple)\S*/i;

function extractMapsUrl(text: string): string | null {
  const match = text.match(MAPS_PATTERN);
  return match ? match[0] : null;
}

const POLL_INTERVAL = 3000;

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const car = getCarById(id);

  const [lastMessage, setLastMessage] = useState<SmsMessage | null>(null);
  const [sendingAction, setSendingAction] = useState<ActionKey | null>(null);
  const [waitingAction, setWaitingAction] = useState<ActionKey | null>(null);
  const [sendError, setSendError] = useState<ActionKey | null>(null);
  const [releaseClicks, setReleaseClicks] = useState(0);
  const [imgError, setImgError] = useState(false);

  const RELEASE_THRESHOLD = 3;

  const actionSentAtRef = useRef<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const storageKey = `car_last_msg_${id}`;
  const waitingKey = `car_waiting_action_${id}`;
  const sentAtKey = `car_action_sent_at_${id}`;

  useEffect(() => {
    const storedMsg = localStorage.getItem(storageKey);
    if (storedMsg) {
      try { setLastMessage(JSON.parse(storedMsg)); } catch { /* ignore */ }
    }

    const storedAction = localStorage.getItem(waitingKey) as ActionKey | null;
    const storedSentAt = localStorage.getItem(sentAtKey);
    if (storedAction && storedSentAt) {
      setWaitingAction(storedAction);
      actionSentAtRef.current = Number(storedSentAt);
    }
  }, [storageKey, waitingKey, sentAtKey]);

  const poll = useCallback(async () => {
    if (!car) return;
    try {
      const res = await fetch(
        `/api/sms?type=inbound&to=${encodeURIComponent(car.phoneNumber)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!data.error) {
        const msg = data as SmsMessage;
        setLastMessage(msg);
        localStorage.setItem(storageKey, JSON.stringify(msg));

        // Unblock buttons if response arrived after the action was sent
        if (
          actionSentAtRef.current !== null &&
          new Date(msg.createdAt).getTime() >= actionSentAtRef.current
        ) {
          setWaitingAction(null);
          actionSentAtRef.current = null;
          setReleaseClicks(0);
          localStorage.removeItem(waitingKey);
          localStorage.removeItem(sentAtKey);
        }
      }
    } catch { /* silent — keep last message */ }
  }, [car, storageKey, waitingKey, sentAtKey]);

  useEffect(() => {
    if (!car) return;
    poll();
    pollingRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [car, poll]);

  const forceRelease = () => {
    setWaitingAction(null);
    actionSentAtRef.current = null;
    setReleaseClicks(0);
    localStorage.removeItem(waitingKey);
    localStorage.removeItem(sentAtKey);
  };

  const handleWaitingClick = () => {
    const next = releaseClicks + 1;
    if (next >= RELEASE_THRESHOLD) {
      forceRelease();
    } else {
      setReleaseClicks(next);
    }
  };

  const sendAction = async (action: (typeof ACTIONS)[number]) => {
    if (!car || sendingAction || waitingAction) return;
    setSendingAction(action.key);
    setSendError(null);
    try {
      await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: car.phoneNumber, message: action.message }),
      });
      const sentAt = Date.now();
      actionSentAtRef.current = sentAt;
      localStorage.setItem(waitingKey, action.key);
      localStorage.setItem(sentAtKey, String(sentAt));
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
              {isSending
                ? "Sending…"
                : isWaiting
                ? releaseClicks === 0
                  ? "Waiting… (tap 3× to unlock)"
                  : `Unlock in ${RELEASE_THRESHOLD - releaseClicks} tap${RELEASE_THRESHOLD - releaseClicks > 1 ? "s" : ""}…`
                : isErr
                ? "✗ Failed"
                : action.label}
            </button>
          );
        })}
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
            {extractMapsUrl(lastMessage.message) && (
              <a
                href={extractMapsUrl(lastMessage.message)!}
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
