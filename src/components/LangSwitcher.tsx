"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Globe2, Check, ChevronDown } from "lucide-react";
import { LOCALES } from "@/lib/i18n";
import styles from "./LangSwitcher.module.css";

// ── Inline flag SVGs ──────────────────────────────────────────────────────────

function FlagGB() {
  return (
    <svg className={styles.flagSvg} viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="20" height="15" fill="#012169"/>
      <path d="M0 0L20 15M20 0L0 15" stroke="#fff" strokeWidth="4.5"/>
      <path d="M0 0L20 15M20 0L0 15" stroke="#C8102E" strokeWidth="2.5"/>
      <path d="M10 0V15M0 7.5H20" stroke="#fff" strokeWidth="6"/>
      <path d="M10 0V15M0 7.5H20" stroke="#C8102E" strokeWidth="3.5"/>
    </svg>
  );
}

function FlagFR() {
  return (
    <svg className={styles.flagSvg} viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="20" height="15" fill="#ED2939"/>
      <rect width="13" height="15" fill="#fff"/>
      <rect width="7" height="15" fill="#002395"/>
    </svg>
  );
}

// ── Meta ──────────────────────────────────────────────────────────────────────

type FlagComponent = () => React.ReactElement;

const META: Record<string, { label: string; short: string; Flag: FlagComponent }> = {
  en: { label: "English",  short: "EN", Flag: FlagGB },
  fr: { label: "Français", short: "FR", Flag: FlagFR },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LangSwitcher({
  locale,
  ariaLabel = "Select language",
  dropUp    = false,
}: {
  locale:     string;
  ariaLabel?: string;
  dropUp?:    boolean;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const switchLocale = (next: string) => {
    document.cookie = `vitecamion_locale=${next};path=/;max-age=31536000;SameSite=Lax`;
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
    setOpen(false);
  };

  const current = META[locale];

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        <Globe2 size={13} strokeWidth={1.75} className={styles.globeIcon} aria-hidden="true" />
        <span className={styles.code}>{current?.short ?? locale.toUpperCase()}</span>
        <ChevronDown
          size={11}
          strokeWidth={2.25}
          className={`${styles.caret} ${open ? styles.caretOpen : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          className={`${styles.dropdown} ${dropUp ? styles.dropdownUp : ""}`}
          role="menu"
          aria-label={ariaLabel}
        >
          {LOCALES.map((l) => {
            const meta   = META[l];
            const active = l === locale;
            return (
              <li key={l}>
                <button
                  role="menuitem"
                  className={`${styles.option} ${active ? styles.optionActive : ""}`}
                  onClick={() => switchLocale(l)}
                  aria-current={active ? "true" : undefined}
                >
                  <span className={styles.flag}>
                    <meta.Flag />
                  </span>
                  <span className={styles.optionLabel}>{meta.label}</span>
                  {active && (
                    <Check size={11} strokeWidth={2.5} className={styles.check} aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
