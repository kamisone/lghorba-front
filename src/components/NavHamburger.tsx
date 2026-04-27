"use client";

import { useState, useEffect, useRef } from "react";
import styles from "@/app/page.module.css";

interface Props {
  links: { href: string; label: string }[];
  ctaLabel: string;
}

export default function NavHamburger({ links, ctaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={styles.hamburgerWrapper}>
      <button
        className={`${styles.hamburger} ${open ? styles.hamburgerActive : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <nav className={styles.mobileMenu}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={styles.mobileMenuLink}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contact"
            className={styles.mobileMenuCta}
            onClick={() => setOpen(false)}
          >
            {ctaLabel}
          </a>
        </nav>
      )}
    </div>
  );
}
