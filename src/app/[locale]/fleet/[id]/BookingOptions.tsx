"use client";

import { useState } from "react";
import { useResolvedBookingDates } from "@/hooks/useResolvedBookingDates";
import { buildTuroUrl, buildGetaroundUrl, type PlatformDateContext } from "@/lib/platformUrls";
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

function TuroLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="55" height="20" viewBox="0 0 88 32" fill="none" aria-hidden="true">
      <path fill="#121214" d="m77.416 2.853-.529-.666a6 6 0 0 0-.556-.614C75.261.56 73.824 0 72.305 0H0v32h72.319a5.86 5.86 0 0 0 4.026-1.573c.203-.187.38-.387.556-.6.013-.014.013-.027.027-.04l10.817-13.774z" />
      <path fill="#fff" d="M65.513 22.927c-4.162 0-7.429-3.213-7.429-7.333 0-3.867 3.349-7.014 7.456-7.014 1.993 0 3.85.747 5.246 2.08a7.06 7.06 0 0 1 2.183 5.134c0 3.933-3.349 7.133-7.456 7.133m0-11.867c-1.37 0-2.63.48-3.538 1.334-.922.866-1.423 2.093-1.423 3.426 0 1.267.528 2.44 1.504 3.307.936.84 2.21 1.32 3.498 1.32 1.328 0 2.562-.48 3.497-1.373a4.65 4.65 0 0 0 1.464-3.387c0-1.293-.529-2.48-1.478-3.333-.949-.84-2.182-1.294-3.524-1.294M31.76 22.874c-3.322 0-4.772-1.587-5.246-2.28-.732-1.067-.8-2.094-.8-3.227v-8.4h2.48v8.4c0 .88.055 1.547.665 2.16.61.6 1.653.88 3.199.88 1.26 0 2.087-.2 2.643-.627.583-.466.868-1.253.868-2.413v-8.4h2.453v8.4c0 1.307-.067 2.32-1.003 3.507-1.328 1.733-3.863 2-5.26 2m20.482-.267-2.792-4.933h-4.528v4.933h-2.494V8.967h8.16c2.63 0 4.474 1.8 4.474 4.373 0 2.014-1.125 3.6-2.942 4.16l2.942 5.107zm-1.64-7.387c.596 0 1.992-.186 1.992-1.973 0-1.133-.759-1.84-1.992-1.84h-5.666v3.813zm-35.963 7.387V11.42H9.895V8.967h11.928v2.453H17.08v11.187z" />
      <path fill="#fff" d="M65.541 8.607c1.98 0 3.836.734 5.232 2.08a7.07 7.07 0 0 1 2.17 5.12c0 3.907-3.335 7.094-7.43 7.094-4.147 0-7.414-3.214-7.414-7.307.014-3.853 3.348-6.987 7.442-6.987m0 11.867a5.1 5.1 0 0 0 3.51-1.373 4.63 4.63 0 0 0 1.465-3.4 4.51 4.51 0 0 0-1.478-3.36c-.935-.84-2.182-1.307-3.524-1.307-1.383 0-2.643.48-3.565 1.346-.922.88-1.437 2.107-1.437 3.454 0 1.267.529 2.453 1.505 3.333a5.4 5.4 0 0 0 3.524 1.307M50.603 8.994c2.697 0 4.446 1.867 4.446 4.36 0 1.933-1.07 3.587-2.942 4.147l2.928 5.093H52.27l-2.792-4.934h-4.569v4.934h-2.453v-13.6zm-5.694 6.253h5.694c1.667 0 2.02-1.2 2.02-2 0-1.066-.678-1.867-2.02-1.867h-5.694zm-6.9-6.253v8.373c0 1.293-.067 2.307-1.002 3.493-1.343 1.734-3.864 1.987-5.246 1.987-3.308 0-4.758-1.587-5.22-2.267-.731-1.066-.786-2.08-.786-3.213V8.994h2.427v8.373c0 .88.054 1.56.678 2.174.61.6 1.667.893 3.212.893 1.261 0 2.101-.2 2.657-.64.597-.467.881-1.267.881-2.44V8.98h2.4zm-16.212 0v2.413h-4.744v11.187h-2.4V11.407H9.91V8.994zm43.744-.427c-4.12 0-7.47 3.16-7.47 7.04 0 4.12 3.281 7.347 7.456 7.347 4.121 0 7.47-3.2 7.47-7.147 0-1.96-.773-3.8-2.183-5.16-1.41-1.346-3.28-2.08-5.273-2.08m0 11.867c-1.288 0-2.548-.48-3.47-1.307-.963-.866-1.491-2.04-1.491-3.293 0-1.333.501-2.547 1.423-3.413.908-.854 2.155-1.334 3.524-1.334 1.329 0 2.562.467 3.484 1.307a4.41 4.41 0 0 1 1.464 3.32 4.58 4.58 0 0 1-1.45 3.36 5.1 5.1 0 0 1-3.484 1.36M50.603 8.954h-8.187v13.68h2.534v-4.92h4.487l2.779 4.907.013.026h2.888l-.04-.066-2.902-5.04c1.803-.56 2.928-2.16 2.928-4.174-.013-2.613-1.857-4.413-4.5-4.413m-5.653 2.48h5.64c1.233 0 1.965.68 1.965 1.813 0 1.76-1.383 1.96-1.966 1.96H44.95zm-6.886-2.48H35.57v8.427c0 1.16-.285 1.933-.868 2.4-.542.426-1.369.626-2.616.626-1.532 0-2.576-.293-3.186-.88-.61-.6-.664-1.267-.664-2.146V8.954h-2.521v8.427c0 1.133.054 2.16.8 3.24.474.693 1.938 2.293 5.26 2.293 1.395 0 3.93-.267 5.286-2.014.935-1.186 1.003-2.213 1.003-3.52V8.955m-16.213 0H9.882v2.506h4.744v11.174h2.48V11.46h4.745V8.955" />
    </svg>
  );
}

function GetaroundLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 64 64" fill="#c3c" aria-hidden="true">
      <path d="M13.993 45.43c2.383.45 5.86.966 8.3.837 4.38-.13 6.763-1.417 8.116-2.898 1.675-1.803 1.546-3.865 1.6-3.93-.386.322-2.834 1.417-4.38 1.224-1.868-.258-3.414-.966-4.5-2.06-1.6-1.546-2.254-3.736-1.74-6.248a49.31 49.31 0 0 1 1.353-4.38 34.64 34.64 0 0 1 1.739-4.251c.644-1.353 1.675-2.576 2.834-3.543 1.03-.837 2.2-1.48 3.414-1.932 1.546-.515 3.285-.773 4.96-.515.966.13 1.997.515 2.383.644 0 0-.773.7-1.48 1.932l-1.224 2.383a9.18 9.18 0 0 0-1.288-.258c-.644-.064-1.288 0-1.868.258a4.52 4.52 0 0 0-2.448 2.19c-.515 1.095-1.224 2.898-1.6 3.93l-1.224 3.993c-.386 1.675.58 3.092 2.254 3.285 1.74.258 3.414-.773 4.25-2.383.7-1.353 1.417-4.25 2.448-6.7 1.288-3.027 2.448-5.024 2.834-5.54l1.16-1.546c.837-.966 3.285-3.414 6.956-4.83l1.224-.386L34.282.922a3.07 3.07 0 0 0-4.38 0L.918 29.778a3.07 3.07 0 0 0 0 4.38l10.885 10.885c.064 0 1.224.193 2.2.386zm49.145-15.717L51.03 17.67c-.064 0-.837.258-1.353.45-.966.386-2.32.966-3.67 1.932-1.03.773-2.06 1.74-2.898 3.156-.902 1.48-1.803 3.67-2.705 6.055-1.288 3.414-2.448 7.794-3.414 11.143-.644 2.254-.966 4.25-3.027 7.407-1.353 2.126-3.027 3.543-5.024 5.088l-5.282 4.058 6.12 6.12a3.07 3.07 0 0 0 4.38 0l28.92-28.92c1.224-1.224 1.224-3.156.064-4.444z" />
    </svg>
  );
}

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
