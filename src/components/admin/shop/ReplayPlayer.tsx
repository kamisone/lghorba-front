"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { eventWithTime } from "@rrweb/types";
import "rrweb-player/dist/style.css";
import styles from "./SessionReplay.module.css";

export interface ReplayPlayerHandle {
  goto: (timestampMs: number) => void;
}

interface Props {
  events: eventWithTime[];
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  onTimeUpdate?: (ms: number) => void;
}

// rrweb-player is a vanilla (Svelte-compiled) class, not a React component —
// mounted imperatively into `mountRef`. This file is only ever loaded via
// `next/dynamic(..., { ssr: false })` (see SessionReplayModal.tsx), matching
// the existing pattern for other heavy admin-only client components
// (e.g. front/src/app/admin/content/page.tsx's ContentEditor).
const ReplayPlayer = forwardRef<ReplayPlayerHandle, Props>(function ReplayPlayer(
  { events, viewportWidth, viewportHeight, onTimeUpdate },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    goto: (ms: number) => {
      try {
        playerRef.current?.goTo?.(ms, false);
      } catch {
        // A seek on a not-yet-ready/destroyed player is a no-op, not a crash.
      }
    },
  }));

  useEffect(() => {
    if (!mountRef.current || events.length === 0) return;
    let disposed = false;
    let player: any;

    import("rrweb-player").then(({ default: RrwebPlayer }) => {
      if (disposed || !mountRef.current) return;
      player = new RrwebPlayer({
        target: mountRef.current,
        props: {
          events,
          width: Math.min(viewportWidth || 900, 900),
          height: Math.min(viewportHeight || 600, 600),
          autoPlay: false,
          showController: true,
        },
      });
      playerRef.current = player;
      if (onTimeUpdate) {
        player.addEventListener?.("ui-update-current-time", (payload: { payload: number }) => {
          onTimeUpdate(payload.payload);
        });
      }
    });

    const onResize = () => {
      try {
        playerRef.current?.triggerResize?.();
      } catch {
        // Ignore — resize is a nice-to-have, not worth surfacing an error over.
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      try {
        player?.$destroy?.();
      } catch {
        // Best-effort teardown.
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  if (events.length === 0) {
    return (
      <div className={styles.stateBox}>
        No recorded frames for this session — the replay is unavailable.
      </div>
    );
  }

  return <div ref={mountRef} className={styles.playerMount} />;
});

export default ReplayPlayer;
