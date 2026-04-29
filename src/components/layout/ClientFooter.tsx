import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import styles from "./ClientFooter.module.css";

interface Props {
  locale: string;
}

export default function ClientFooter({ locale }: Props) {
  const t = getTranslations(locale);
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerLogo}>
          <img src="/assets/logo_vitecamion_icon.png" alt="vitecamion" className={styles.logoIcon} />
          <span className={styles.logoText}>vitecamion</span>
        </div>
        <p className={styles.footerCopy}>
          © {new Date().getFullYear()} vitecamion · {t.footer.rights}
        </p>
        <div className={styles.footerLinks}>
          <Link href={`/${locale}/privacy-policy`} className={styles.footerLink}>
            {t.footer.privacy}
          </Link>
          <Link href="/admin" className={styles.footerLink}>
            {t.footer.admin}
          </Link>
        </div>
      </div>
    </footer>
  );
}
