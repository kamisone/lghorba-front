"use client";

import { useEffect, useState } from "react";
import { useErrorStore, type ErrorEntry } from "@/lib/errorReporter";
import styles from "./ErrorsPanel.module.css";
import { ChevronUp, ChevronDown, Copy, X, AlertTriangle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BackendErrorEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  message: string;
  stack?: string;
}

interface DisplayEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  url?: string;
  context?: string;
  level: "error" | "warning";
  source: "client" | "backend";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function truncate(str: string | undefined, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function toDisplay(e: ErrorEntry): DisplayEntry {
  return { id: e.id, timestamp: e.timestamp, message: e.message, stack: e.stack, url: e.url, context: e.context, level: e.level, source: "client" };
}

function backendToDisplay(e: BackendErrorEntry): DisplayEntry {
  return {
    id:        `back-${e.id}`,
    timestamp: e.timestamp,
    message:   e.message,
    stack:     e.stack,
    url:       `${e.method} ${e.url}`,
    context:   `backend:${e.status}`,
    level:     "error",
    source:    "backend",
  };
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ErrorRow({ entry, onDismiss }: { entry: DisplayEntry; onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    const text = [
      `[${entry.source.toUpperCase()}] ${entry.message}`,
      entry.url     ? `URL: ${entry.url}`         : null,
      entry.context ? `Context: ${entry.context}` : null,
      `Time: ${entry.timestamp}`,
      entry.stack   ? `\nStack:\n${entry.stack}`  : null,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className={`${styles.row} ${entry.level === "warning" ? styles.rowWarning : styles.rowError}`}>
      <div className={styles.rowMain}>
        <span className={`${styles.dot} ${entry.level === "warning" ? styles.dotWarning : styles.dotError}`} />
        <div className={styles.rowContent}>
          <div className={styles.rowTopLine}>
            <span className={`${styles.sourceBadge} ${entry.source === "backend" ? styles.sourceBadgeBackend : styles.sourceBadgeClient}`}>
              {entry.source === "backend" ? "Backend" : "Client"}
            </span>
            <span className={styles.rowMessage}>{truncate(entry.message, 55)}</span>
            <span className={styles.rowTime}>{relativeTime(entry.timestamp)}</span>
          </div>
          {entry.url && (
            <div className={styles.rowUrl}>{truncate(entry.url, 80)}</div>
          )}
        </div>
        <div className={styles.rowActions}>
          {entry.stack && (
            <button className={styles.actionBtn} onClick={() => setExpanded(v => !v)} title="Toggle stack trace">
              {expanded ? <ChevronUp size={16} strokeWidth={1.75} /> : <ChevronDown size={16} strokeWidth={1.75} />}
            </button>
          )}
          <button className={styles.actionBtn} onClick={handleCopy} title="Copy to clipboard">
            <Copy size={16} strokeWidth={1.75} />
          </button>
          <button className={`${styles.actionBtn} ${styles.dismissBtn}`} onClick={() => onDismiss(entry.id)} title="Dismiss">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {expanded && entry.stack && (
        <pre className={styles.stack}>{entry.stack}</pre>
      )}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function ErrorsPanel({ onClose }: Props) {
  const { errors: clientErrors, clear, dismiss } = useErrorStore();

  const [backendErrors,   setBackendErrors]   = useState<BackendErrorEntry[]>([]);
  const [backendLoading,  setBackendLoading]  = useState(true);
  const [dismissedIds,    setDismissedIds]    = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/next-api/errors", { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then((data: BackendErrorEntry[]) => setBackendErrors(Array.isArray(data) ? data : []))
      .catch(() => setBackendErrors([]))
      .finally(() => setBackendLoading(false));
  }, []);

  const handleDismiss = (id: string) => {
    if (id.startsWith("back-")) {
      setDismissedIds(prev => new Set(Array.from(prev).concat(id)));
    } else {
      dismiss(id);
    }
  };

  const allEntries: DisplayEntry[] = [
    ...clientErrors.map(toDisplay),
    ...backendErrors.map(backendToDisplay).filter(e => !dismissedIds.has(e.id)),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const handleClearAll = () => {
    clear();
    setDismissedIds(new Set(backendErrors.map(e => `back-${e.id}`)));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          <AlertTriangle size={16} strokeWidth={1.75} />
          Errors
        </span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close error panel">
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className={styles.body}>
        {backendLoading ? (
          <p className={styles.empty}>Loading…</p>
        ) : allEntries.length === 0 ? (
          <p className={styles.empty}>No errors recorded.</p>
        ) : (
          allEntries.map(entry => (
            <ErrorRow key={entry.id} entry={entry} onDismiss={handleDismiss} />
          ))
        )}
      </div>

      {allEntries.length > 0 && (
        <div className={styles.footer}>
          <button className={styles.clearBtn} onClick={handleClearAll}>
            Clear all ({allEntries.length})
          </button>
        </div>
      )}
    </div>
  );
}
