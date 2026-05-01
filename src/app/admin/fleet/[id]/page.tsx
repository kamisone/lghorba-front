"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { Car } from "@/components/admin/data";
import CarFormModal from "@/components/admin/CarFormModal";
import styles from "./car-detail.module.css";
import { extractMapsUrl, extractLatLng } from "@/components/admin/mapUtils";
import { useToast } from "@/components/toast/ToastContext";
import { useModalUrl } from "@/hooks/useModalUrl";

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

type ActionKey = "open" | "close" | "parking" | "location" | "sleep" | "wake" | "stoplocation" | "network"
  | "parkingplus" | "parkingminus" | "openplus" | "openminus" | "closeplus" | "closeminus";

interface SendableAction { key: ActionKey; message: string; }

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


const FINE_ACTIONS: { key: ActionKey; label: string; sign: "+" | "−"; message: string }[] = [
  { key: "parkingplus",  label: "Parking", sign: "+", message: "parkingplus" },
  { key: "parkingminus", label: "Parking", sign: "−", message: "parkingminus" },
  { key: "openplus",     label: "Open",    sign: "+", message: "openplus" },
  { key: "openminus",    label: "Open",    sign: "−", message: "openminus" },
  { key: "closeplus",    label: "Close",   sign: "+", message: "closeplus" },
  { key: "closeminus",   label: "Close",   sign: "−", message: "closeminus" },
];

const POLL_INTERVAL = 3000;
const RELEASE_THRESHOLD = 3;

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const storageKey        = `car_last_msg_${id}`;
  const waitingKey        = `car_waiting_action_${id}`;
  const inboundIdAtSendKey = `car_inbound_id_at_send_${id}`;

  const { openModal, closeModal } = useModalUrl();

  const [car, setCar]               = useState<Car | null>(null);
  const [carLoading, setCarLoading] = useState(true);
  const [showEdit, setShowEdit]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [photos, setPhotos]         = useState<{ id: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const photoInputRef     = useRef<HTMLInputElement>(null);

  const [lastConsumed, setLastConsumed] = useState<LastConsumed | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "null"); } catch { return null; }
  });

  const [waitingAction, setWaitingAction] = useState<ActionKey | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(waitingKey) as ActionKey | null;
  });

  const [sendingAction, setSendingAction]   = useState<ActionKey | null>(null);
  const [sendError, setSendError]           = useState<ActionKey | null>(null);
  const [releaseClicks, setReleaseClicks]   = useState(0);
  const [unlockAvailable, setUnlockAvailable] = useState(false);
  const [imgError, setImgError]                         = useState(false);
  const [locationMapFullscreen, setLocationMapFullscreen] = useState(false);

  const unlockTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitingActionRef  = useRef(waitingAction);
  const inboundIdAtSendRef = useRef<number | null>(
    typeof window !== "undefined" ? Number(localStorage.getItem(inboundIdAtSendKey)) || null : null
  );

  waitingActionRef.current = waitingAction;
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/next-api/cars/${id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCar(data))
      .finally(() => setCarLoading(false));
  }, [id]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("modal") === "car-edit") setShowEdit(true);
  }, []);

  useEffect(() => {
    fetch(`/next-api/cars/${id}/photos`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(setPhotos)
      .catch(() => {});
  }, [id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const res = await fetch(`/next-api/cars/${id}/photos`, { method: "POST", body: formData });
      if (res.ok) {
        const p = await res.json();
        setPhotos(prev => [...prev, p]);
        toast.success("Photo added");
      } else {
        toast.error("Failed to upload photo");
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(`/next-api/cars/${id}/photos/${photoId}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        toast.success("Photo removed");
      } else {
        toast.error("Failed to delete photo");
      }
    } catch {
      toast.error("Failed to delete photo");
    } finally {
      setDeletingPhotoId(null);
    }
  };

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
      const res = await fetch(`/next-api/sms/last-consumed?to=${encodeURIComponent(car.phoneNumber)}`, { cache: "no-store" });
      const data: LastConsumed = await res.json();
      if ("inbound" in data) {
        setLastConsumed(data);
        localStorage.setItem(storageKey, JSON.stringify(data));
        const newInboundId = data.inbound?.id ?? null;
        if (waitingActionRef.current !== null && newInboundId !== null && newInboundId !== inboundIdAtSendRef.current) {
          clearWaiting();
        }
      }
    } catch { /* silent */ }
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

  const sendAction = async (action: SendableAction) => {
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !car) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const res = await fetch(`/next-api/cars/${car.id}/photo`, { method: "POST", body: formData });
      if (res.ok) setCar(await res.json());
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!car) return;
    setDeleting(true);
    try {
      await fetch(`/next-api/cars/${car.id}`, { method: "DELETE" });
      router.replace("/cars");
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const isBlocked = sendingAction !== null || waitingAction !== null;

  if (carLoading) {
    return (
      <div className={styles.page}>
        <Link href="/admin/fleet" className={styles.back}>← Back to Fleet</Link>
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

  const mapsUrl = lastConsumed?.inbound ? extractMapsUrl(lastConsumed.inbound.message) : null;

  const isAwaitingResponse = (() => {
    if (!lastConsumed?.outbound) return false;
    if (!lastConsumed.inbound) return true;
    return new Date(lastConsumed.outbound.createdAt) > new Date(lastConsumed.inbound.createdAt);
  })();

  return (
    <div className={styles.page}>
      <Link href="/admin/fleet" className={styles.back}>← Back to Fleet</Link>

      <div className={styles.header}>
        <div
          className={`${styles.photoWrapper} ${styles.photoUploadable}`}
          onClick={() => fileInputRef.current?.click()}
          title="Click to change photo"
        >
          {car.photo && !imgError ? (
            <img
              src={`/next-api/cars/${car.id}/photo`}
              alt={car.name}
              className={styles.photo}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={styles.photoPlaceholder}>🚗</div>
          )}
          <div className={styles.photoOverlay}>
            {uploading ? <span className={styles.uploadSpinner} /> : <span className={styles.cameraIcon}>📷</span>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />
        </div>
        <div className={styles.info}>
          <h1 className={styles.carName}>{car.name}</h1>
          <p className={styles.immat}>{car.immatriculation}</p>
          <p className={styles.phone}>{car.phoneNumber}</p>
          {car.description && <p className={styles.desc}>{car.description}</p>}
          <div className={styles.carActions}>
            <button className={styles.editBtn} onClick={() => { setShowEdit(true); openModal("car-edit"); }}>Edit</button>
            {confirmDelete ? (
              <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Confirm delete?"}
              </button>
            ) : (
              <button className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>Delete</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Photos ── */}
      <h2 className={styles.sectionTitle}>Photos</h2>
      <div className={styles.photosCard}>
        <div className={styles.photosGrid}>
          {photos.map(p => (
            <div key={p.id} className={styles.photoThumb}>
              <img src={`/next-api/cars/${id}/photos/${p.id}`} alt="" className={styles.photoThumbImg} />
              <button
                className={styles.photoDeleteBtn}
                onClick={() => handlePhotoDelete(p.id)}
                disabled={deletingPhotoId === p.id}
                aria-label="Delete photo"
              >
                {deletingPhotoId === p.id ? <span className={styles.photoDeleteSpinner} /> : "×"}
              </button>
            </div>
          ))}
          <button className={styles.photoAddBtn} onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
            {uploadingPhoto
              ? <span className={styles.photoAddSpinner} />
              : <><span className={styles.photoAddIcon}>+</span><span>Add</span></>}
          </button>
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
      </div>

      <h2 className={styles.sectionTitle}>Actions</h2>
      <div className={styles.actionsCard}>
      <div className={styles.actionsGrid}>
        {ACTIONS.map((action) => {
          const isSending = sendingAction === action.key;
          const isWaiting = waitingAction === action.key;
          const isErr     = sendError === action.key;
          const canUnlock = isWaiting && unlockAvailable;
          const isLoading = isSending || (isWaiting && !unlockAvailable);
          return (
            <button
              key={action.key}
              className={`${styles.actionBtn} ${styles[action.key]} ${isLoading ? styles.sending : ""} ${canUnlock ? styles.waiting : ""} ${isErr ? styles.err : ""}`}
              onClick={() => isWaiting ? handleWaitingClick() : sendAction(action)}
              disabled={!isWaiting && isBlocked}
            >
              <span className={styles.actionIcon}>
                {isLoading ? <span className={styles.sendingSpinner} /> : action.icon}
              </span>
              <span className={styles.actionLabel}>
                {isSending
                  ? "Sending…"
                  : isLoading
                  ? "Waiting…"
                  : canUnlock
                  ? releaseClicks === 0
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

        <div className={styles.fineActionsSection}>
          <span className={styles.fineActionsLabel}>Fine-tune</span>
          <div className={styles.fineActionsGrid}>
            {FINE_ACTIONS.map((action) => {
              const isSending = sendingAction === action.key;
              const isWaiting = waitingAction === action.key;
              const isErr     = sendError === action.key;
              const canUnlock = isWaiting && unlockAvailable;
              const isLoading = isSending || (isWaiting && !unlockAvailable);
              return (
                <button
                  key={action.key}
                  className={`${styles.fineActionBtn} ${styles[action.key]} ${isLoading ? styles.sending : ""} ${canUnlock ? styles.waiting : ""} ${isErr ? styles.err : ""}`}
                  onClick={() => isWaiting ? handleWaitingClick() : sendAction(action)}
                  disabled={!isWaiting && isBlocked}
                >
                  {isLoading
                    ? <span className={styles.sendingSpinner} />
                    : <span className={styles.fineActionSign}>{action.sign}</span>
                  }
                  <span className={styles.fineActionName}>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>
        Last Message
        <span className={styles.pollDot} title="Polling every 3s" />
      </h2>
      <div className={`${styles.messageBox} ${isAwaitingResponse ? styles.messageBoxWaiting : ""}`}>
        {lastConsumed ? (
          <>
            <div className={styles.msgRow}>
              <span className={styles.msgLabel}>Response</span>
              <p className={styles.messageText}>{lastConsumed.inbound?.message ?? "—"}</p>
              {lastConsumed.inbound && <p className={styles.messageMeta}>{new Date(lastConsumed.inbound.createdAt).toLocaleString()}</p>}
            </div>
            <div className={styles.msgRow}>
              <span className={styles.msgLabel}>Last command</span>
              <p className={styles.messageText}>{lastConsumed.outbound?.message ?? "—"}</p>
              {lastConsumed.outbound && <p className={styles.messageMeta}>{new Date(lastConsumed.outbound.createdAt).toLocaleString()}</p>}
            </div>
            {mapsUrl && (() => {
              const coords = extractLatLng(mapsUrl);
              if (!coords) return (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsBtn}>Open in Maps</a>
              );
              const { lat, lng } = coords;
              const d = 0.005;
              const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
              const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
              return (
                <>
                  <div className={styles.mapPreview}>
                    <iframe src={embedUrl} className={styles.mapFrame} title="Car location map" loading="lazy" referrerPolicy="no-referrer" />
                    <button className={styles.mapExpandBtn} onClick={() => setLocationMapFullscreen(true)} title="Fullscreen">⛶</button>
                  </div>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsBtn}>Open in Maps →</a>
                  {locationMapFullscreen && (
                    <div className={styles.mapFullscreenOverlay}>
                      <div className={styles.mapFullscreenBar}>
                        <span className={styles.mapFullscreenLabel}>Location</span>
                        <button className={styles.mapFullscreenClose} onClick={() => setLocationMapFullscreen(false)}>✕ Close</button>
                      </div>
                      <iframe src={embedUrl} className={styles.mapFullscreenFrame} title="Car location map fullscreen" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <p className={styles.noMessage}>No messages yet.</p>
        )}
      </div>

      <Link href={`/admin/fleet/${car.id}/rent`} className={styles.rentCard}>
        <div className={styles.rentCardLeft}>
          <span className={styles.rentCardIcon}>📅</span>
          <div>
            <p className={styles.rentCardTitle}>Rent Management</p>
            <p className={styles.rentCardSub}>Schedules · Tracking · Positions</p>
          </div>
        </div>
        <span className={styles.rentCardArrow}>→</span>
      </Link>

      {showEdit && (
        <CarFormModal
          car={car}
          onClose={() => { setShowEdit(false); closeModal(); }}
          onSaved={(updated) => { setCar(updated); setShowEdit(false); closeModal(); }}
        />
      )}
    </div>
  );
}
