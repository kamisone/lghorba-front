"use client";

import { useId, useMemo, useRef, useState } from "react";
import ImageLightbox, { type LightboxImage } from "@/components/shop/ImageLightbox";
import styles from "./ZoomedImagesGallery.module.css";

export interface ZoomedImageItem {
  id: string;
  url: string;
  altText?: string | null;
}

/** Seconds of constant-rate zoom-out — kept short so the cruise reads as
 *  quick and energetic, not a slow crawl. */
const ZOOM_SECONDS = 2.2;
/** Brief pause at full reveal, once the zoom-out finishes, before handing
 *  off to the next image. */
const HOLD_SECONDS = 1.1;
/** Starting zoom for every image — steep enough that content isn't
 *  recognizable yet, matched by the `.img` base rule's fallback transform. */
const START_SCALE = 2.5;
/** Cruise rate — fast, this is what makes the zoom-out feel energetic. */
const CRUISE_RATE = (START_SCALE - 1) / ZOOM_SECONDS;
/** How much zoom is left (scale above 1) when the cruise hands off to the
 *  decelerating tail — small, so the deceleration stays a short portion of
 *  the animation rather than a second, slower zoom-out. */
const DECEL_RESIDUAL = 0.1;
/**
 * Dedicated duration for the decelerating tail. This is deliberately NOT
 * `DECEL_RESIDUAL / CRUISE_RATE` (the time a *linear* continuation would
 * take): a curve that must end at zero velocity has to spend part of its
 * span *faster* than its own average rate to make up for trailing off to a
 * stop, so ending exactly on time at the cruise rate would force a visible
 * speed-up right at the handoff. Giving it roughly 3x the naive linear time
 * keeps its peak velocity at or below the cruise rate — a genuine
 * deceleration, not a blip. (easeOutCubic's peak-to-average ratio is ~3.)
 */
const DECEL_SECONDS = (DECEL_RESIDUAL / CRUISE_RATE) * 3;
/** Constant-rate portion of the zoom, derived so cruise + decel covers
 *  exactly START_SCALE → 1 at CRUISE_RATE plus the (slower) decel tail. */
const CRUISE_SECONDS = (START_SCALE - 1 - DECEL_RESIDUAL) / CRUISE_RATE;
/** Total time each image "owns" the stage — zoom + decel + hold — before
 *  the next image's turn begins. */
const SLOT_SECONDS = CRUISE_SECONDS + DECEL_SECONDS + HOLD_SECONDS;
/** Crossfade overlap between consecutive images — just enough to avoid a
 *  literal single-frame flash; short enough to read as an immediate switch,
 *  not a lingering dissolve. */
const FADE_SECONDS = 0.25;
// easeOutCubic, not CSS's `ease-out` keyword: `ease-out` has near-zero
// velocity at its start (control points collapse there), so motion handed
// off from the linear cruise actually blips faster before slowing — a
// stutter, not a glide. This curve decreases monotonically from the handoff
// to a full stop, given the generous DECEL_SECONDS above.
const DECEL_CURVE = "cubic-bezier(.215,.61,.355,1)";

/**
 * Builds one @keyframes rule shared by every layered image, plus each image's
 * `animation-delay`. Every image runs the *same* keyframes on the *same*
 * N * SLOT_SECONDS clock, just phase-shifted by its index — one stylesheet
 * rule drives the whole infinite loop, no JS ticking required.
 *
 * Per image, in order: fade in (still at START_SCALE) → zoom out at a
 * constant linear rate (CRUISE_SECONDS, at CRUISE_RATE) → decelerate
 * smoothly through DECEL_SECONDS to settle exactly at scale(1) → hold there
 * for HOLD_SECONDS → fade out (immediately, no dwell) into the next image,
 * which is already fading in.
 *
 * The shape is deliberately a bump, not a fade-out-then-fade-in: image i's
 * fade-in (ending at its nominal slot start) overlaps image i-1's fade-out
 * (starting at that same instant), so there's always at least one image at
 * full opacity — no shared instant where every layer is at opacity 0.
 */
function buildKeyframes(name: string, count: number) {
  const f = (n: number) => Number(n.toFixed(3));
  const decelStartScale = f(1 + DECEL_RESIDUAL);

  if (count <= 1) {
    const cycleSeconds = 2 * CRUISE_SECONDS + 2 * DECEL_SECONDS + HOLD_SECONDS;
    const mainPct = (CRUISE_SECONDS / cycleSeconds) * 100;
    const tailPct = (DECEL_SECONDS / cycleSeconds) * 100;
    const holdPct = (HOLD_SECONDS / cycleSeconds) * 100;

    return {
      cycleSeconds,
      css: `@keyframes ${name} {
        0% { opacity: 1; transform: scale(${START_SCALE}); animation-timing-function: linear; }
        ${f(mainPct)}% { opacity: 1; transform: scale(${decelStartScale}); animation-timing-function: ${DECEL_CURVE}; }
        ${f(mainPct + tailPct)}% { opacity: 1; transform: scale(1); }
        ${f(mainPct + tailPct + holdPct)}% { opacity: 1; transform: scale(1); }
        100% { opacity: 1; transform: scale(${START_SCALE}); }
      }`,
      delayFor: () => "0s",
    };
  }

  const cycleSeconds = count * SLOT_SECONDS;
  const fadePct = (FADE_SECONDS / cycleSeconds) * 100;
  const mainPct = (CRUISE_SECONDS / cycleSeconds) * 100;
  const tailPct = (DECEL_SECONDS / cycleSeconds) * 100;
  const holdPct = (HOLD_SECONDS / cycleSeconds) * 100;

  const fadeInEnd = fadePct;
  const zoomMainEnd = fadeInEnd + mainPct;
  const zoomTailEnd = zoomMainEnd + tailPct;
  const holdEnd = zoomTailEnd + holdPct;
  const fadeOutEnd = holdEnd + fadePct;

  const css = `@keyframes ${name} {
    0% { opacity: 0; transform: scale(${START_SCALE}); animation-timing-function: linear; }
    ${f(fadeInEnd)}% { opacity: 1; transform: scale(${START_SCALE}); animation-timing-function: linear; }
    ${f(zoomMainEnd)}% { opacity: 1; transform: scale(${decelStartScale}); animation-timing-function: ${DECEL_CURVE}; }
    ${f(zoomTailEnd)}% { opacity: 1; transform: scale(1); }
    ${f(holdEnd)}% { opacity: 1; transform: scale(1); }
    ${f(fadeOutEnd)}% { opacity: 0; transform: scale(1); }
    100% { opacity: 0; transform: scale(${START_SCALE}); }
  }`;

  // `animation-delay: d` puts this image's local 0% (fade-in start) at real
  // time t = d. We want that to land FADE_SECONDS before the image's nominal
  // slot boundary (i * SLOT_SECONDS), so it's already blending in while the
  // previous image is still fading out — never a shared instant at opacity 0.
  const delayFor = (i: number) => `${i * SLOT_SECONDS - FADE_SECONDS}s`;

  return { cycleSeconds, css, delayFor };
}

export default function ZoomedImagesGallery({ items, title, ariaLabel }: {
  items: ZoomedImageItem[];
  /** Optional static heading — hidden when empty. */
  title?: string;
  ariaLabel: string;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const animationName = `zoomedStage${reactId}`;
  const startedAt = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const count = items.length;
  const stage = useMemo(() => (count > 0 ? buildKeyframes(animationName, count) : null), [animationName, count]);

  if (count === 0 || !stage) return null;

  const lightboxImages: LightboxImage[] = items.map(i => ({ id: i.id, url: i.url, altText: i.altText }));

  const openAtCurrent = () => {
    const elapsed = (performance.now() - startedAt.current) / 1000;
    const phase = ((elapsed % stage.cycleSeconds) + stage.cycleSeconds) % stage.cycleSeconds;
    setLightboxIndex(Math.min(Math.floor(phase / SLOT_SECONDS), count - 1));
  };

  return (
    <section className={styles.section} aria-label={ariaLabel}>
      {title?.trim() && <h2 className={styles.heading}>{title}</h2>}

      <style>{stage.css}</style>

      <div
        className={`${styles.stage} ${ready ? styles.stageReady : ""}`}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        onClick={openAtCurrent}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openAtCurrent();
          }
        }}
      >
        {items.map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.url}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            className={styles.img}
            onLoad={i === 0 ? () => setReady(true) : undefined}
            style={{
              animationName,
              animationDuration: `${stage.cycleSeconds}s`,
              animationDelay: stage.delayFor(i),
            }}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          ariaLabel={ariaLabel}
        />
      )}
    </section>
  );
}
