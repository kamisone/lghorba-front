"use client";

import { useEffect, useRef, useState } from "react";
import useHls from "@/hooks/useHls";

interface Props {
  desktopSrc: string;
  mobileSrc: string;
  /** HLS master playlists — preferred over the mp4 sources when playable */
  desktopHlsSrc?: string;
  mobileHlsSrc?: string;
  breakpoint?: number;
  className?: string;
}

export default function ResponsiveHeroVideo({
  desktopSrc, mobileSrc, desktopHlsSrc, mobileHlsSrc, breakpoint = 767, className,
}: Props) {
  const [choice, setChoice] = useState<{ src: string; hlsSrc: string | null } | null>(null);
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

  if (!choice) return null;

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay
      loop
      muted
      playsInline
      preload="none"
      aria-hidden="true"
    >
      {!useHlsPlayback && <source src={choice.src} type="video/mp4" />}
    </video>
  );
}
