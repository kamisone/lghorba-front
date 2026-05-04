"use client";

import Link from "next/link";
import styles from "./car-public.module.css";

interface Props {
  start: string;
  end: string;
  locale: string;
  backLabel: string;
  searchHref: string;
}

function fmtDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export default function SearchContextBar({ start, end, locale, backLabel, searchHref }: Props) {
  return (
    <div className={styles.searchContextBar}>
      <Link href={searchHref} className={styles.searchContextBack}>
        ← {backLabel}
      </Link>
      <span className={styles.searchContextDates}>
        📅 {fmtDate(start, locale)} → {fmtDate(end, locale)}
      </span>
    </div>
  );
}
