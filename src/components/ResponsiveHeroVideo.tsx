"use client";

import { useEffect, useRef, useState } from "react";
import useHls from "@/hooks/useHls";

interface Props {
  desktopSrc: string;
  mobileSrc: string;
  /** HLS master playlists — preferred over the mp4 sources when playable */
  desktopHlsSrc?: string;
  mobileHlsSrc?: string;
  /**
   * Light first-frame images. Server-rendered, so they paint before hydration
   * and stay visible until the video actually plays — no black flash.
   */
  desktopPoster?: string;
  mobilePoster?: string;
  breakpoint?: number;
  className?: string;
}

export default function ResponsiveHeroVideo({
  desktopSrc, mobileSrc, desktopHlsSrc, mobileHlsSrc, desktopPoster, mobilePoster,
  breakpoint = 767, className,
}: Props) {
  const [choice, setChoice] = useState<{ src: string; hlsSrc: string | null } | null>(null);
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mobile = window.innerWidth <= breakpoint;
    setChoice({
      src:    mobile ? mobileSrc : desktopSrc,
      hlsSrc: (mobile ? mobileHlsSrc : desktopHlsSrc) ?? null,
    });
  }, [desktopSrc, mobileSrc, desktopHlsSrc, mobileHlsSrc, breakpoint]);

  const hlsFailed = useHls(videoRef, choice?.hlsSrc, {
    onReady: () => videoRef.current?.play().catch(() => {}),
  });
  const useHlsPlayback = !!choice?.hlsSrc && !hlsFailed;

  // Progressive path only — load() would detach an attached HLS MediaSource
  useEffect(() => {
    if (choice && !useHlsPlayback && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [choice, useHlsPlayback]);

  const posterFallback = desktopPoster ?? mobilePoster;

  return (
    <>
      {/* Poster underlay: in the server HTML, so it shows instantly; the media
          query picks the right variant without downloading both. */}
      {posterFallback && (
        <picture aria-hidden="true">
          {mobilePoster && desktopPoster && (
            <source media={`(max-width: ${breakpoint}px)`} srcSet={mobilePoster} />
          )}
          <img
            src={posterFallback}
            alt=""
            className={className}
            decoding="async"
            {...({ fetchpriority: "high" } as Record<string, string>)}
          />
        </picture>
      )}

      {choice && (
        <video
          ref={videoRef}
          className={className}
          style={{ opacity: started ? 1 : 0, transition: "opacity .5s ease" }}
          onPlaying={() => setStarted(true)}
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          aria-hidden="true"
        >
          {!useHlsPlayback && <source src={choice.src} type="video/mp4" />}
        </video>
      )}
    </>
  );
}
