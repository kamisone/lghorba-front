"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import useHls from "@/hooks/useHls";
import ReelsViewer from "./ReelsViewer";
import styles from "./SocialVideosCarousel.module.css";

export interface SocialVideoItem {
  id: string;
  /** Progressive mp4 URL (fallback / non-HLS browsers) */
  url: string;
  /** HLS master playlist URL — preferred when playable */
  hlsUrl?: string | null;
  posterUrl?: string | null;
  title?: string | null;
  durationSeconds?: number | null;
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/* ── Single reel card: autoplays muted while ≥60% visible, pauses otherwise ── */

function ReelCard({ video, suspended, onOpen }: {
  video: SocialVideoItem;
  /** True while the fullscreen viewer is open — cards pause to save resources. */
  suspended: boolean;
  onOpen: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);

  const shouldPlay = visible && !suspended;
  const shouldPlayRef = useRef(shouldPlay);
  shouldPlayRef.current = shouldPlay;

  // Track visibility — drives autoplay/pause and defers any loading offscreen
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.intersectionRatio >= 0.6);
        if (entry.isIntersecting) setStarted(true);
      },
      { threshold: [0, 0.6] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hlsFailed = useHls(videoRef, video.hlsUrl, {
    enabled: started,
    onReady: () => {
      if (shouldPlayRef.current) videoRef.current?.play().catch(() => {});
    },
  });
  const useHlsPlayback = !!video.hlsUrl && !hlsFailed;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (shouldPlay) el.play().catch(() => {});
    else el.pause();
  }, [shouldPlay]);

  return (
    <div
      ref={cardRef}
      className={styles.card}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={video.title?.trim() || "Play video"}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className={styles.cardVideo}
        src={started && !useHlsPlayback ? video.url : undefined}
        poster={video.posterUrl ?? undefined}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className={styles.cardShade} aria-hidden="true" />

      {!playing && (
        <span className={styles.cardPlayBadge} aria-hidden="true">
          <Play size={18} fill="currentColor" />
        </span>
      )}

      {video.durationSeconds != null && (
        <span className={styles.cardDuration}>{formatDuration(video.durationSeconds)}</span>
      )}

      {video.title?.trim() && <span className={styles.cardBadge}>{video.title}</span>}
    </div>
  );
}

/* ── Carousel section ── */

interface Props {
  videos: SocialVideoItem[];
  title: string;
  ariaLabel: string;
}

/**
 * "Social Videos" reels section: horizontally snap-scrolling 9:16 video cards
 * that autoplay muted while in view. Clicking a card opens the fullscreen
 * ReelsViewer. Reusable — pass any list of SocialVideoItem.
 */
export default function SocialVideosCarousel({ videos, title, ariaLabel }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  // Whether every card already fits without scrolling (typically 1-2 videos)
  // — when it does, the track centers instead of hugging the left edge, and
  // the now-pointless scroll arrows are hidden. Seeded from the video count
  // so the server-rendered markup already guesses right and there's no
  // layout flash before the real measurement below runs.
  const [fits, setFits] = useState(() => videos.length <= 2);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    setFits(el.scrollWidth <= el.clientWidth + 1);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, videos.length]);

  function scrollByCard(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  if (!videos.length) return null;

  return (
    <section className={styles.section} aria-label={ariaLabel}>
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          {!fits && (
            <div className={styles.arrows}>
              <button
                type="button"
                className={styles.arrowBtn}
                onClick={() => scrollByCard(-1)}
                disabled={!canPrev}
                aria-label="Scroll videos left"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                className={styles.arrowBtn}
                onClick={() => scrollByCard(1)}
                disabled={!canNext}
                aria-label="Scroll videos right"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </div>

        <div ref={trackRef} className={`${styles.track} ${fits ? styles.trackCentered : ""}`}>
          {videos.map((video, i) => (
            <ReelCard
              key={video.id}
              video={video}
              suspended={viewerIndex !== null}
              onOpen={() => setViewerIndex(i)}
            />
          ))}
        </div>
      </div>

      {viewerIndex !== null && (
        <ReelsViewer
          videos={videos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          ariaLabel={ariaLabel}
        />
      )}
    </section>
  );
}
