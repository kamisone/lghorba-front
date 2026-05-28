"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import styles from "./ClientHeader.module.css";

interface Props {
  links:    { href: string; label: string }[];
  ctaHref:  string;
  ctaLabel: string;
  locale:   string;
}

export default function HamburgerMenu({ links, ctaHref, ctaLabel, locale }: Props) {
  const pathname = usePathname();
  const [open,    setOpen]    = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = getTranslations(locale);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const drawer = open && (
    <>
      <div
        className={styles.drawerOverlay}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        id="mobile-drawer"
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.navigationMenu}
      >
        <div className={styles.drawerHead}>
          <Link
            href={`/${locale}`}
            className={styles.drawerLogo}
            onClick={() => setOpen(false)}
          >
            <Image
              src="/assets/logo_vitecamion_icon.png"
              alt=""
              aria-hidden={true}
              width={30}
              height={30}
              className={styles.drawerLogoIcon}
            />
            <Image
              src="/assets/logo_vitecamion_text.png"
              alt="vitecamion"
              width={100}
              height={17}
              className={styles.drawerLogoText}
            />
          </Link>
          <button
            className={styles.drawerClose}
            onClick={() => setOpen(false)}
            aria-label={t.nav.closeDrawer}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <nav className={styles.drawerNav} aria-label={t.nav.mobileNavAriaLabel}>
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className={[
                styles.drawerLink,
                isActive(l.href) ? styles.drawerLinkActive : "",
              ].filter(Boolean).join(" ")}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className={styles.drawerDivider} aria-hidden="true" />
          <a href={ctaHref} className={styles.drawerCta} onClick={() => setOpen(false)}>
            {ctaLabel}
          </a>
        </nav>

        <div className={styles.drawerFooter}>
          <p className={styles.drawerFooterText}>© {new Date().getFullYear()} vitecamion</p>
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.hamburgerWrapper}>
      <button
        className={`${styles.hamburger} ${open ? styles.hamburgerOpen : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
        aria-expanded={open}
        aria-controls="mobile-drawer"
      >
        <span />
        <span />
        <span />
      </button>
      {mounted && createPortal(drawer, document.body)}
    </div>
  );
}
