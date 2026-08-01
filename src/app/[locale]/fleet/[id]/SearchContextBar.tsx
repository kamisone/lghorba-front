"use client";

import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import { useResolvedBookingDates } from "@/hooks/useResolvedBookingDates";
import { toBcp47 } from "@/lib/i18n";
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
  return new Intl.DateTimeFormat(toBcp47(locale), {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Paris",
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

  // For URL source the server already built the correct href.
  // For storage source we reconstruct it from the resolved context so the
  // user can modify their search instead of being sent to the fleet list.
  const backHref = ctx.source === "url"
    ? searchHref
    : `/${locale}/search?start=${encodeURIComponent(ctx.start)}&end=${encodeURIComponent(ctx.end)}${
        ctx.address
          ? `&lat=${ctx.address.lat}&lng=${ctx.address.lng}&address=${encodeURIComponent(ctx.address.label)}`
          : ""
      }`;

  return (
    <div className={styles.searchContextBar}>
      <Link href={backHref} className={styles.searchContextBack}>
        ← {backLabel}
      </Link>
      <span className={styles.searchContextDates}>
        <CalendarDays size={16} strokeWidth={1.75} /> {fmtDate(ctx.start, locale)} <ArrowRight size={14} strokeWidth={1.75} /> {fmtDate(ctx.end, locale)}
      </span>
    </div>
  );
}
