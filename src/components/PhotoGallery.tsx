"use client";

import { useEffect, useRef } from "react";
import styles from "./PhotoGallery.module.css";

interface Props {
  carId: string;
  photoIds: string[];
  carName: string;
  initialIndex: number;
  onClose: () => void;
}

export default function PhotoGallery({
  carId, photoIds, carName, initialIndex, onClose,
}: Props) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Jump to the photo that was active in the slider (instant, no animation)
  useEffect(() => {
    if (initialIndex > 0) {
      itemRefs.current[initialIndex]?.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, [initialIndex]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${carName} — photo gallery`}
    >
      {/* ── Sticky header ── */}
      <div className={styles.header}>
        <div className={styles.headerMeta}>
          <span className={styles.headerName}>{carName}</span>
          <span className={styles.headerCount}>
            {photoIds.length} photo{photoIds.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close gallery">
          <span className="material-symbols-outlined">close</span>
          <span className={styles.closeBtnLabel}>Close</span>
        </button>
      </div>

      {/* ── Photo list ── */}
      <div className={styles.list}>
        {photoIds.map((id, i) => (
          <div
            key={id}
            ref={el => { itemRefs.current[i] = el; }}
            className={styles.item}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/next-api/public/cars/${carId}/photos/${id}`}
              alt={`${carName} — photo ${i + 1}`}
              className={styles.photo}
              loading={i <= initialIndex + 1 ? "eager" : "lazy"}
            />
            <span className={styles.badge}>{i + 1} / {photoIds.length}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
