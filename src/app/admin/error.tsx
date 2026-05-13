"use client";

import { useEffect } from "react";
import styles from "./error.module.css";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    // TODO: replace with captureException(error) once Sentry/Datadog is wired up
    console.error("[admin error boundary]", error);
  }, [error]);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.iconWrap} aria-hidden="true">
          <span className="material-symbols-outlined">error</span>
        </div>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.body}>
          An unexpected error occurred in this section of the admin panel.
          Your other data is safe — only this view was affected.
        </p>
        {error.digest && (
          <p className={styles.digest}>Error ID: {error.digest}</p>
        )}
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={reset}>
            Try again
          </button>
          <a href="/admin" className={styles.btnSecondary}>
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
