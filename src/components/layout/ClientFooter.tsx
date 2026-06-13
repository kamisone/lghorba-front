import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import styles from "./ClientFooter.module.css";
import CookieSettingsButton from "@/components/consent/CookieSettingsButton";
import { VisaIcon, MastercardIcon, AmexIcon } from "./PaymentIcons";
import { InstagramIcon, FacebookIcon, TiktokIcon } from "./SocialIcons";
import NewsletterForm from "./NewsletterForm";
import LangSwitcher from "@/components/LangSwitcher";

interface Props {
  locale: string;
}

export default function ClientFooter({ locale }: Props) {
  const t = getTranslations(locale);

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>

        <div className={styles.footerGrid}>

          {/* Brand / contact column */}
          <div className={styles.footerCol}>
            <div className={styles.footerLogo}>
              <img
                src="/assets/logo_vitecamion_icon.png"
                alt="vitecamion"
                className={styles.logoIcon}
              />
              <span className={styles.logoText}>vitecamion</span>
            </div>
            <p className={styles.footerTagline}>{t.footer.tagline}</p>
            <div className={styles.footerContact}>
              <div className={styles.contactRow}>
                <MapPin className={styles.contactIcon} size={16} aria-hidden="true" />
                <span>{t.footer.addressLine}</span>
              </div>
              <a href={`mailto:${t.footer.emailLabel}`} className={styles.contactRow}>
                <Mail className={styles.contactIcon} size={16} aria-hidden="true" />
                <span>{t.footer.emailLabel}</span>
              </a>
            </div>
            <div className={styles.socialRow}>
              <a href="#" aria-label={t.footer.socialInstagram} className={styles.socialLink}>
                <InstagramIcon className={styles.socialIcon} />
              </a>
              <a href="#" aria-label={t.footer.socialFacebook} className={styles.socialLink}>
                <FacebookIcon className={styles.socialIcon} />
              </a>
              <a href="#" aria-label={t.footer.socialTiktok} className={styles.socialLink}>
                <TiktokIcon className={styles.socialIcon} />
              </a>
            </div>
          </div>

          {/* Company column */}
          <div className={styles.footerCol}>
            <h3 className={styles.footerHeading}>{t.footer.companyHeading}</h3>
            <nav className={styles.footerLinks}>
              <Link href={`/${locale}/about`} className={styles.footerLink}>
                {t.footer.about}
              </Link>
              <Link href={`/${locale}/shop`} className={styles.footerLink}>
                {t.footer.shop}
              </Link>
              <Link href="/admin" className={styles.footerLink}>
                {t.footer.admin}
              </Link>
            </nav>
          </div>

          {/* Legal column */}
          <div className={styles.footerCol}>
            <h3 className={styles.footerHeading}>{t.footer.legalHeading}</h3>
            <nav className={styles.footerLinks}>
              <Link href={`/${locale}/privacy-policy`} className={styles.footerLink}>
                {t.footer.privacy}
              </Link>
              <Link href={`/${locale}/legal`} className={styles.footerLink}>
                {t.footer.legal}
              </Link>
              <Link href={`/${locale}/cookies`} className={styles.footerLink}>
                {t.footer.cookies}
              </Link>
              <CookieSettingsButton
                label={t.consent.settingsBtn}
                className={styles.footerLink}
              />
            </nav>
          </div>

          {/* Newsletter column */}
          <div className={styles.footerCol}>
            <h3 className={styles.footerHeading}>{t.newsletter.heading}</h3>
            <p className={styles.footerTagline}>{t.newsletter.body}</p>
            <NewsletterForm locale={locale} />
          </div>

        </div>

        {/* ── Bottom row: copyright · language · payment methods ── */}
        <div className={styles.footerBottom}>
          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} vitecamion · {t.footer.rights}
          </p>
          <LangSwitcher locale={locale} ariaLabel={t.nav.selectLanguage} dropUp />
          <div className={styles.paymentMethods}>
            <span className={styles.paymentLabel}>{t.footer.paymentsAccepted}</span>
            <VisaIcon className={styles.paymentIcon} />
            <MastercardIcon className={styles.paymentIcon} />
            <AmexIcon className={styles.paymentIcon} />
          </div>
        </div>

      </div>
    </footer>
  );
}
