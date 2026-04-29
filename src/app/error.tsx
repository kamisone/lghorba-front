"use client";

import { useEffect } from "react";
import styles from "./error-pages.module.css";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.fullPage}>
      <p className={styles.code}>500</p>
      <div className={styles.accentBar} />
      <h1 className={`${styles.title} ${styles.titleDark}`}>Something went wrong</h1>
      <p className={`${styles.sub} ${styles.subDark}`}>
        An unexpected error occurred. You can try again or return to the home page.
      </p>
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={reset}>
          Try again
        </button>
        <a href="/" className={`${styles.btnSecondary} ${styles.btnSecondaryDark}`}>
          Go to home
        </a>
      </div>
    </div>
  );
}
