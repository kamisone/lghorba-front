"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { RentPosition } from "./RentMap";
import styles from "./PositionLookup.module.css";

interface Props {
  positions: RentPosition[];
  onDelete: (positionId: string) => Promise<void>;
}

export default function PositionLookup({ positions, onDelete }: Props) {
  const [query,    setQuery]    = useState("");
  const [error,    setError]    = useState("");
  const [found,    setFound]    = useState<{ index: number; position: RentPosition } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleFind = () => {
    const n = Number(query);
    if (!Number.isInteger(n) || n < 1 || n > positions.length) {
      setError(`Enter a number between 1 and ${positions.length}`);
      setFound(null);
      return;
    }
    setError("");
    setFound({ index: n, position: positions[n - 1] });
  };

  const handleDelete = async () => {
    if (!found) return;
    if (!confirm(`Delete position #${found.index}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete(found.position.id);
      setFound(null);
      setQuery("");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.form}>
        <span className={styles.label}>Find position #</span>
        <input
          className={styles.input}
          type="number"
          min={1}
          max={positions.length}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleFind(); }}
          placeholder={`1-${positions.length}`}
        />
        <button type="button" className={styles.findBtn} onClick={handleFind} disabled={!query}>
          Find
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {found && (
        <div className={styles.card}>
          <div className={styles.cardMain}>
            <span className={styles.cardTitle}>#{found.index}</span>
            <span className={styles.cardMeta}>
              {new Date(found.position.recordedAt).toLocaleString()} · {found.position.lat}, {found.position.lng}
            </span>
            <a
              className={styles.cardLink}
              href={`https://www.google.com/maps?q=${found.position.lat},${found.position.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Google Maps
            </a>
            {found.position.rawMessage && (
              <p className={styles.cardRaw}>{found.position.rawMessage}</p>
            )}
          </div>
          <div className={styles.cardActions}>
            <button type="button" className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button type="button" className={styles.closeBtn} onClick={() => setFound(null)} aria-label="Close">
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
