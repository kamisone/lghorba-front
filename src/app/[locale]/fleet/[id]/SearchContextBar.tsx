"use client";

import Link from "next/link";
import { useResolvedBookingDates } from "@/hooks/useResolvedBookingDates";
import styles from "./car-public.module.css";

interface Props {
  urlStart:   string;
  urlEnd:     string;
  locale:     string;
  backLabel:  string;
  searchHref: string;
  fleetHref:  string;
  fleetLabel: string;
}

function fmtDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Shows a contextual header above the car detail page.
 *
 * - Resolved context present (URL or localStorage):
 *     displays the dates that BookingPanel has pre-filled so the two are
 *     always visually in sync. The back-link points to the search results
 *     when dates came from the URL, or to the fleet list when they came
 *     from localStorage (no search URL to return to).
 *
 * - No resolved context (nothing usable): plain fleet breadcrumb.
 *
 * Both this component and BookingPanel call useResolvedBookingDates with
 * the same inputs, so ctx.start / ctx.end are always identical.
 */
export default function SearchContextBar({
  urlStart, urlEnd, locale, backLabel, searchHref, fleetHref, fleetLabel,
}: Props) {
  const ctx = useResolvedBookingDates(urlStart, urlEnd);

  if (!ctx) {
    return (
      <div className={styles.breadcrumb}>
        <Link href={fleetHref} className={styles.backLink}>
          ← {fleetLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.searchContextBar}>
      {ctx.source === "url" ? (
        <Link href={searchHref} className={styles.searchContextBack}>
          ← {backLabel}
        </Link>
      ) : (
        <Link href={fleetHref} className={styles.searchContextBack}>
          ← {fleetLabel}
        </Link>
      )}
      <span className={styles.searchContextDates}>
        📅 {fmtDate(ctx.start, locale)} → {fmtDate(ctx.end, locale)}
      </span>
    </div>
  );
}
