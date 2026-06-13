"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ClientHeader.module.css";

export default function ScrollAwareHeader({ children }: { children: React.ReactNode }) {
  const [hidden,   setHidden]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

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

  // Keep --header-offset in sync so sticky panels below the header
  // can transition their `top` value alongside the header hide/show animation.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--header-offset",
      hidden ? "0px" : "64px",
    );
  }, [hidden]);

  return (
    <header
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
