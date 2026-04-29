"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import styles from "./ClientHeader.module.css";

interface Props {
  links:      { href: string; label: string }[];
  ctaHref:    string;
  ctaLabel:   string;
  locale:     string;
  activeHref: string;
}

export default function HamburgerMenu({ links, ctaHref, ctaLabel, locale, activeHref }: Props) {
  const [open,    setOpen]    = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only enable portal after hydration
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  const isActive = (href: string) => {
    if (href.includes("#")) return false;
    return activeHref === href || activeHref.startsWith(href + "/");
  };

  const drawer = open && (
    <>
      {/* Backdrop — rendered at body level so fixed positioning is relative to viewport */}
      <div
        className={styles.drawerOverlay}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        id="mobile-drawer"
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header row */}
        <div className={styles.drawerHead}>
          <Link
            href={`/${locale}`}
            className={styles.drawerLogo}
            onClick={() => setOpen(false)}
          >
            <img className={styles.drawerLogoIcon} src="/assets/logo_vitecamion_icon.png" alt="" aria-hidden="true" />
            <img className={styles.drawerLogoText} src="/assets/logo_vitecamion_text.png" alt="vitecamion" />
          </Link>
          <button
            className={styles.drawerClose}
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className={styles.drawerNav} aria-label="Mobile navigation">
          {links.map((l) => (
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

        {/* Footer */}
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
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-drawer"
      >
        <span />
        <span />
        <span />
      </button>

      {/* Portal renders overlay + drawer directly in <body>, escaping the
          header's transform containing block */}
      {mounted && createPortal(drawer, document.body)}
    </div>
  );
}
