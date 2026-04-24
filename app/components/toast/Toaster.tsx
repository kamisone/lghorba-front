"use client";

import { useToast, type ToastType } from "./ToastContext";
import styles from "./Toaster.module.css";

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  warning: "⚠",
};

export default function Toaster() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;

  return (
    <div className={styles.container} role="region" aria-label="Notifications">
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`} role="alert">
          <span className={styles.icon}>{ICONS[t.type]}</span>
          <span className={styles.message}>{t.message}</span>
          <button className={styles.close} onClick={() => dismiss(t.id)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
