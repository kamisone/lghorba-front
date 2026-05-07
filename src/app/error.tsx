"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getTranslations, LOCALES } from "@/lib/i18n";
import styles from "./error-pages.module.css";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: Props) {
  const pathname = usePathname();
  // `html[lang]` is set by RootLayout and is the most reliable client-side source;
  // fall back to pathname segment for cases where the layout hasn't rendered yet.
  const htmlLang = typeof document !== "undefined" ? document.documentElement.lang : "";
  const segment  = (LOCALES.includes(htmlLang as (typeof LOCALES)[number]) ? htmlLang : null)
                ?? pathname?.split("/")[1] ?? "";
  const locale   = LOCALES.includes(segment as (typeof LOCALES)[number]) ? segment : "en";
  const t        = getTranslations(locale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.fullPage}>
      <p className={styles.code}>500</p>
      <div className={styles.accentBar} />
      <h1 className={`${styles.title} ${styles.titleDark}`}>{t.errors.unexpected}</h1>
      <p className={`${styles.sub} ${styles.subDark}`}>{t.errors.unexpectedDesc}</p>
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={reset}>
          {t.errors.tryAgain}
        </button>
        <a href="/" className={`${styles.btnSecondary} ${styles.btnSecondaryDark}`}>
          {t.errors.goHome}
        </a>
      </div>
    </div>
  );
}
