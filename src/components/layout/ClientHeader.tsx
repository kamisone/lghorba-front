import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import HamburgerMenu from "./HamburgerMenu";
import ScrollAwareHeader from "./ScrollAwareHeader";
import ActiveNavLink from "./ActiveNavLink";
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
  const ctaHref = `/${locale}/fleet`;

  return (
    <>
      <div className={styles.headerSpacer} aria-hidden="true" />
      <ScrollAwareHeader>
        <div className={styles.inner}>

          {/* ── Logo ── */}
          <Link href={`/${locale}`} className={styles.logo} aria-label={t.nav.logoAriaLabel}>
            <Image
              src="/assets/logo_vitecamion_icon.png"
              alt=""
              aria-hidden={true}
              width={34}
              height={34}
              className={styles.logoIcon}
              priority
            />
            <Image
              src="/assets/logo_vitecamion_text.png"
              alt="vitecamion"
              width={120}
              height={20}
              className={styles.logoTextImg}
              priority
            />
          </Link>

          {/* ── Desktop nav ── */}
          <nav className={styles.navLinks} aria-label={t.nav.navAriaLabel}>
            {navLinks.map(link => (
              <ActiveNavLink
                key={link.href}
                href={link.href}
                locale={locale}
                linkClassName={styles.navLink}
                activeLinkClassName={styles.navLinkActive}
              >
                {link.label}
              </ActiveNavLink>
            ))}
          </nav>

          {/* ── Right slot ── */}
          <div className={styles.navRight}>
            <LangSwitcher locale={locale} ariaLabel={t.nav.selectLanguage} />
            <Link href={`/${locale}/shop`} className={styles.crossLink}>
              <ShoppingBag size={16} strokeWidth={2} aria-hidden="true" />
              <span className={styles.crossLinkLabel}>{t.nav.shop}</span>
            </Link>
            <span className={styles.navDivider} aria-hidden="true" />
            <Link href={ctaHref} className={styles.navCta}>
              {t.nav.bookNow}
            </Link>
            <HamburgerMenu
              links={navLinks}
              ctaHref={ctaHref}
              ctaLabel={t.nav.bookNow}
              locale={locale}
            />
          </div>

        </div>
      </ScrollAwareHeader>
    </>
  );
}
