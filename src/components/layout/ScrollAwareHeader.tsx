"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ClientHeader.module.css";

export default function ScrollAwareHeader({ children }: { children: React.ReactNode }) {
  const [hidden,   setHidden]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      if (y < 80) {
        setHidden(false);
      } else if (y > lastY.current) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keep --header-offset and --header-height in sync with the real, measured
  // header height — the commerce header is taller than the plain 64px main
  // header (two rows, and it wraps onto extra lines on narrower widths where
  // the search bar/icon row no longer fit on one line), and both render
  // through this component. A hardcoded px value per breakpoint drifts out of
  // sync with that wrapping and lets the fixed header cover page content.
  useEffect(() => {
    const setOffset = () => {
      const height = headerRef.current?.offsetHeight ?? 64;
      // --header-offset follows the hide/show animation, for sticky panels
      // that should slide up under the header once it scrolls away.
      document.documentElement.style.setProperty(
        "--header-offset",
        hidden ? "0px" : `${height}px`,
      );
      // --header-height never collapses to 0 — the header is `position:
      // fixed`, so content must always reserve its full height regardless of
      // the hide-on-scroll transform (used by the layout spacer + any
      // top-of-page sticky element measured against the header at rest).
      document.documentElement.style.setProperty("--header-height", `${height}px`);
    };
    setOffset();
    window.addEventListener("resize", setOffset, { passive: true });
    return () => window.removeEventListener("resize", setOffset);
  }, [hidden]);

  return (
    <header
      ref={headerRef}
      className={[
        styles.header,
        hidden   ? styles.headerHidden : "",
        scrolled ? styles.scrolled     : "",
      ].filter(Boolean).join(" ")}
    >
      {children}
    </header>
  );
}
