import { headers } from "next/headers";
import { getTranslations, DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";
import styles from "./error-pages.module.css";

export default function NotFound() {
  const segment = headers().get("x-locale") ?? DEFAULT_LOCALE;
  const locale  = LOCALES.includes(segment as (typeof LOCALES)[number]) ? segment : DEFAULT_LOCALE;
  const t       = getTranslations(locale);

  return (
    <div className={styles.fullPage}>
      <p className={styles.code}>404</p>
      <div className={styles.accentBar} />
      <h1 className={`${styles.title} ${styles.titleDark}`}>{t.errors.notFound}</h1>
      <p className={`${styles.sub} ${styles.subDark}`}>{t.errors.notFoundDesc}</p>
      <div className={styles.actions}>
        <a href={`/${locale}`} className={styles.btnPrimary}>{t.errors.goHome}</a>
      </div>
    </div>
  );
}
