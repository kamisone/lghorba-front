"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import useHls from "@/hooks/useHls";
import type { SocialVideoItem } from "./SocialVideosCarousel";
import styles from "./ReelsViewer.module.css";

interface Props {
  videos: SocialVideoItem[];
  initialIndex?: number;
  onClose: () => void;
  ariaLabel?: string;
}

/**
 * Immersive fullscreen reels viewer: vertical 9:16 stage over a dark blurred
 * backdrop. Tap the video to play/pause, swipe (mobile) or arrow keys /
 * buttons (desktop) to navigate, M to mute, Esc to close. Mount it
 * conditionally — it portals to <body> and locks page scroll.
 */
export default function ReelsViewer({ videos, initialIndex = 0, onClose, ariaLabel = "Video viewer" }: Props) {
  const [current, setCurrent] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(videos.length - 1, 0)),
  );
  const [playing, setPlaying] = useState(false);
  // Opened by an explicit click (user gesture), so sound-on playback is allowed
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number | null>(null);

  const active = videos[current];
  const hasMany = videos.length > 1;

  const prev = useCallback(() => setCurrent(c => (c - 1 + videos.length) % videos.length), [videos.length]);
  const next = useCallback(() => setCurrent(c => (c + 1) % videos.length), [videos.length]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);

  /** Plays with sound; if the browser blocks audible autoplay, falls back to muted. */
  const attemptPlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.play().catch((err: unknown) => {
      if ((err as DOMException)?.name === "NotAllowedError" && !el.muted) {
        el.muted = true;
        setMuted(true);
        el.play().catch(() => {});
      }
    });
  }, []);

  const hlsFailed = useHls(videoRef, active?.hlsUrl, {
    onReady: attemptPlay,
  });
  const useHlsPlayback = !!active?.hlsUrl && !hlsFailed;

  // Keep the element's muted state across slide remounts; autoplay needs it set
  // before play() — React's `muted` prop isn't applied as a DOM property reliably.
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    if (el) el.muted = muted;
  }, [muted]);

  // Keyboard: Esc close, arrows navigate, Space play/pause, M mute
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === " ") { e.preventDefault(); togglePlay(); }
      else if (e.key.toLowerCase() === "m") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next, togglePlay, toggleMute]);

  // Lock page scroll while open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  // Reset progress when the slide changes
  useEffect(() => { setProgress(0); }, [current]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) (delta < 0 ? next() : prev());
    touchStartX.current = null;
  };

  if (!videos.length) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div
        className={styles.stage}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Keyed on the video so slide changes remount + replay the entrance */}
        <div key={active.id} className={styles.frame}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={setVideoRef}
            className={styles.video}
            src={useHlsPlayback ? undefined : active.url}
            poster={active.posterUrl ?? undefined}
            autoPlay
            loop
            playsInline
            disablePictureInPicture
            onLoadedMetadata={attemptPlay}
            onClick={togglePlay}
            onPlaying={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={e => {
              const el = e.currentTarget;
              if (el.duration > 0) setProgress(el.currentTime / el.duration);
            }}
          />

          {active.title?.trim() && <span className={styles.frameBadge}>{active.title}</span>}

          {!playing && (
            <button
              type="button"
              className={styles.centerPlay}
              onClick={togglePlay}
              aria-label="Play video"
            >
              <Play size={26} fill="currentColor" />
            </button>
          )}

          {/* Bottom chrome: progress + controls */}
          <div className={styles.bottomChrome}>
            <div className={styles.progressTrack} aria-hidden="true">
              <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
            </div>
            <div className={styles.controlsRow}>
              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={togglePlay}
                aria-label={playing ? "Pause video" : "Play video"}
              >
                {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              </button>
              <button
                type="button"
                className={styles.ctrlBtn}
                onClick={toggleMute}
                aria-label={muted ? "Unmute video" : "Mute video"}
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              {hasMany && (
                <span className={styles.counter} aria-live="polite">
                  {current + 1} / {videos.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <button type="button" autoFocus className={styles.close} onClick={onClose} aria-label="Close viewer">
        <X size={18} />
      </button>

      {hasMany && (
        <>
          <button
            type="button"
            className={`${styles.nav} ${styles.navPrev}`}
            onClick={e => { e.stopPropagation(); prev(); }}
            aria-label="Previous video"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className={`${styles.nav} ${styles.navNext}`}
            onClick={e => { e.stopPropagation(); next(); }}
            aria-label="Next video"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
