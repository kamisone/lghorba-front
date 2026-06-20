"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  desktopSrc: string;
  mobileSrc: string;
  breakpoint?: number;
  className?: string;
}

export default function ResponsiveHeroVideo({ desktopSrc, mobileSrc, breakpoint = 767, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const chosen = window.innerWidth <= breakpoint ? mobileSrc : desktopSrc;
    setSrc(chosen);
  }, [desktopSrc, mobileSrc, breakpoint]);

  useEffect(() => {
    if (src && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [src]);

  if (!src) return null;

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
      <source src={src} type="video/mp4" />
    </video>
  );
}
