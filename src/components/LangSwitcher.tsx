"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALES } from "@/lib/i18n";
import styles from "./LangSwitcher.module.css";

const META: Record<string, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇬🇧" },
  fr: { label: "Français", flag: "🇫🇷" },
};

export default function LangSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();
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

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Select language"
      >
        <span className={styles.globe}>🌐</span>
        <span className={styles.code}>{locale.toUpperCase()}</span>
        <svg className={`${styles.caret} ${open ? styles.caretOpen : ""}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <ul className={styles.dropdown}>
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                className={`${styles.option} ${l === locale ? styles.optionActive : ""}`}
                onClick={() => switchLocale(l)}
              >
                <span className={styles.flag}>{META[l].flag}</span>
                <span className={styles.optionLabel}>{META[l].label}</span>
                {l === locale && (
                  <svg className={styles.check} width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
