"use client";

import { useEffect } from "react";
import { getTranslations, LOCALES } from "@/lib/i18n";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

function detectLocale(): string {
  if (typeof window === "undefined") return "en";
  const segment = window.location.pathname.split("/")[1] ?? "";
  return LOCALES.includes(segment as (typeof LOCALES)[number]) ? segment : "en";
}

export default function GlobalError({ error, reset }: Props) {
  const t = getTranslations(detectLocale());

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        background: "#001829",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "3rem 1.5rem",
        color: "#ffffff",
      }}>
        <p style={{
          fontSize: "clamp(5rem,18vw,9rem)",
          fontWeight: 900,
          lineHeight: 1,
          margin: "0 0 1rem",
          background: "linear-gradient(135deg,#fff 0%,rgba(255,255,255,.4) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          500
        </p>

        <div style={{ width: 40, height: 3, borderRadius: 3, background: "#8DC220", margin: "0 auto 1.75rem" }} />

        <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 0.6rem", textAlign: "center" }}>
          {t.errors.unexpected}
        </h1>
        <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,.55)", maxWidth: 360, textAlign: "center", margin: "0 0 2rem", lineHeight: 1.65 }}>
          {t.errors.critical}
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "0.7rem 1.75rem", borderRadius: 9, background: "#8DC220",
              color: "#001829", fontWeight: 700, fontSize: "0.9rem",
              border: "none", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {t.errors.tryAgain}
          </button>
          <a
            href="/"
            style={{
              padding: "0.7rem 1.5rem", borderRadius: 9,
              background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.75)",
              border: "1px solid rgba(255,255,255,.12)", fontWeight: 600,
              fontSize: "0.9rem", textDecoration: "none", fontFamily: "inherit",
            }}
          >
            {t.errors.goHome}
          </a>
        </div>
      </body>
    </html>
  );
}
