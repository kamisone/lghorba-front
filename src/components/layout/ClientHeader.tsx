"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import HamburgerMenu from "./HamburgerMenu";
import styles from "./ClientHeader.module.css";

interface Props {
  locale: string;
}

export default function ClientHeader({ locale }: Props) {
  const t        = getTranslations(locale);
  const pathname = usePathname();

  const [hidden,   setHidden]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      if (y < 80) {
        setHidden(false);
      } else if (y > lastY.current) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: `/${locale}`,           label: t.nav.home },
    { href: `/${locale}/fleet`,     label: t.nav.fleet },
    { href: `/${locale}#platforms`, label: t.nav.platforms },
    { href: `/${locale}#how`,       label: t.nav.howItWorks },
    { href: `/${locale}/contact`,   label: t.nav.contact },
  ];

  const ctaHref = `/${locale}/contact`;

  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    if (href === `/${locale}`) return pathname === `/${locale}`;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const headerClass = [
    styles.header,
    hidden   ? styles.headerHidden : "",
    scrolled ? styles.scrolled     : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <div className={styles.headerSpacer} aria-hidden="true" />
      <header className={headerClass}>
        <div className={styles.inner}>

          {/* ── Logo ── */}
          <Link href={`/${locale}`} className={styles.logo} aria-label="vitecamion — home">
            <img
              className={styles.logoIcon}
              src="/assets/logo_vitecamion_icon.png"
              alt=""
              aria-hidden="true"
            />
            <img
              className={styles.logoTextImg}
              src="/assets/logo_vitecamion_text.png"
              alt="vitecamion"
            />
          </Link>

          {/* ── Desktop nav ── */}
          <nav className={styles.navLinks} aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  styles.navLink,
                  isActive(link.href) ? styles.navLinkActive : "",
                ].filter(Boolean).join(" ")}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ── Right slot ── */}
          <div className={styles.navRight}>
            <LangSwitcher locale={locale} />
            <span className={styles.navDivider} aria-hidden="true" />
            <Link href={ctaHref} className={styles.navCta}>
              {t.nav.bookNow}
            </Link>
            <HamburgerMenu
              links={navLinks}
              ctaHref={ctaHref}
              ctaLabel={t.nav.bookNow}
              locale={locale}
              activeHref={pathname}
            />
          </div>

        </div>
      </header>
    </>
  );
}
