import { headers } from "next/headers";
import { getTranslations, DEFAULT_LOCALE } from "@/lib/i18n";
import styles from "@/app/error-pages.module.css";

export default function LocaleNotFound() {
  const locale = headers().get("x-locale") ?? DEFAULT_LOCALE;
  const t = getTranslations(locale);

  return (
    <div className={styles.inLayout}>
      <p className={`${styles.code} ${styles.codeLight}`}>404</p>
      <div className={styles.accentBar} />
      <h1 className={`${styles.title} ${styles.titleLight}`}>Page not found</h1>
      <p className={`${styles.sub} ${styles.subLight}`}>
        The page you are looking for does not exist or has been moved.
      </p>
      <div className={styles.actions}>
        <a href={`/${locale}`} className={styles.btnPrimary}>
          {t.nav.home}
        </a>
        <a href={`/${locale}/fleet`} className={`${styles.btnSecondary} ${styles.btnSecondaryLight}`}>
          {t.nav.fleet}
        </a>
      </div>
    </div>
  );
}
