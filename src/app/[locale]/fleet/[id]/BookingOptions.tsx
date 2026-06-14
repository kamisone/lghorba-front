"use client";

import { useState } from "react";
import { useResolvedBookingDates } from "@/hooks/useResolvedBookingDates";
import { buildTuroUrl, buildGetaroundUrl, type PlatformDateContext } from "@/lib/platformUrls";
import { TuroLogo, GetaroundLogo } from "@/components/icons/PlatformLogos";
import styles from "./BookingOptions.module.css";

export interface BookingOptionsLabels {
  sectionTitle: string;
  primaryBadge: string;
  primaryTitle: string;
  primarySub: string;
  primaryCta: string;
  platformsTitle: string;
  turoLabel: string;
  getaroundLabel: string;
  mobileCtaLabel: string;
  mobileMoreLabel: string;
}

interface BookingOptionsProps {
  turoLink:     string | null;
  getaroundLink: string | null;
  urlStart:     string;
  urlEnd:       string;
  businessTz:   string;
  labels:       BookingOptionsLabels;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function ExternalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BookingOptions({
  turoLink,
  getaroundLink,
  urlStart,
  urlEnd,
  businessTz,
  labels,
}: BookingOptionsProps) {
  const [platformsOpen, setPlatformsOpen] = useState(false);

  const resolved = useResolvedBookingDates(urlStart, urlEnd);

  const ctx: PlatformDateContext | null = resolved
    ? { startISO: resolved.start, endISO: resolved.end, tz: businessTz }
    : null;

  const hasPlatforms = !!(turoLink || getaroundLink);

  const turoHref      = turoLink      ? buildTuroUrl(turoLink, ctx)           : null;
  const getaroundHref = getaroundLink ? buildGetaroundUrl(getaroundLink, ctx) : null;

  const scrollToBooking = () => {
    const el = document.getElementById("booking");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* ── Inline booking options section ────────────────────────────────────*/}
      <section className={styles.section} aria-label={labels.sectionTitle}>

        {/* Primary card */}
        <div className={styles.primaryCard}>
          <div className={styles.primaryCardBody}>
            <div className={styles.primaryMeta}>
              <span className={styles.primaryBadge}>{labels.primaryBadge}</span>
              <h3 className={styles.primaryTitle}>{labels.primaryTitle}</h3>
              <p className={styles.primarySub}>{labels.primarySub}</p>
            </div>
            <button
              type="button"
              className={styles.primaryCta}
              onClick={scrollToBooking}
              aria-label={labels.primaryCta}
            >
              {labels.primaryCta}
              <span className={styles.primaryCtaArrow} aria-hidden="true">↓</span>
            </button>
          </div>
        </div>

        {/* Secondary platform options */}
        {hasPlatforms && (
          <div id="BookingOptions_platforms" className={styles.platforms}>
            <button
              type="button"
              className={styles.platformsToggle}
              onClick={() => setPlatformsOpen(o => !o)}
              aria-expanded={platformsOpen}
            >
              <span>{labels.platformsTitle}</span>
              <ChevronIcon open={platformsOpen} />
            </button>

            {platformsOpen && (
              <div className={styles.platformLinks}>
                {turoHref && (
                  <a
                    href={turoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.platformBtn}
                    aria-label={`${labels.turoLabel} (opens in new tab)`}
                  >
                    <TuroLogo />
                    <span>{labels.turoLabel}</span>
                    <ExternalIcon />
                  </a>
                )}
                {getaroundHref && (
                  <a
                    href={getaroundHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.platformBtn}
                    aria-label={`${labels.getaroundLabel} (opens in new tab)`}
                  >
                    <GetaroundLogo />
                    <span>{labels.getaroundLabel}</span>
                    <ExternalIcon />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Mobile sticky bar ─────────────────────────────────────────────────*/}
      {/* Renders in DOM always; CSS controls visibility. SSR-safe — no window check. */}
      <div className={styles.stickyBar} aria-hidden="true">
        <button
          type="button"
          className={styles.stickyPrimary}
          onClick={scrollToBooking}
          tabIndex={-1}
        >
          {labels.mobileCtaLabel}
          <span aria-hidden="true">↓</span>
        </button>
        {hasPlatforms && (
          <button
            type="button"
            className={styles.stickyMore}
            onClick={() => {
              const el = document.getElementById("BookingOptions_platforms");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              setPlatformsOpen(true);
            }}
            tabIndex={-1}
          >
            {labels.mobileMoreLabel}
          </button>
        )}
      </div>
    </>
  );
}
