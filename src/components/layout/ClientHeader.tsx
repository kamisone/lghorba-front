import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import HamburgerMenu from "./HamburgerMenu";
import styles from "./ClientHeader.module.css";

interface Props {
  locale: string;
}

export default function ClientHeader({ locale }: Props) {
  const t = getTranslations(locale);

  const navLinks = [
    { href: `/${locale}`,           label: t.nav.home },
    { href: `/${locale}/fleet`,     label: t.nav.fleet },
    { href: `/${locale}#platforms`, label: t.nav.platforms },
    { href: `/${locale}#how`,       label: t.nav.howItWorks },
    { href: `/${locale}/contact`,   label: t.nav.contact },
  ];

  const ctaHref = `/${locale}/contact`;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={`/${locale}`} className={styles.logo}>
          <img
            className={styles.logoIcon}
            src="/assets/logo_vitecamion_icon.png"
            alt="vitecamion"
          />
          <img
            className={styles.logoTextImg}
            src="/assets/logo_vitecamion_text.png"
            alt=""
            aria-hidden="true"
          />
        </Link>

        <nav className={styles.navLinks} aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.navRight}>
          <LangSwitcher locale={locale} />
          <Link href={ctaHref} className={styles.navCta}>
            {t.nav.bookNow}
          </Link>
          <HamburgerMenu
            links={navLinks}
            ctaHref={ctaHref}
            ctaLabel={t.nav.bookNow}
          />
        </div>
      </div>
    </header>
  );
}
