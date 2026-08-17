"use client";

import { record } from "rrweb";
import type { eventWithTime } from "@rrweb/types";
import { getTrafficSource } from "./shopBehavior";

/**
 * Session-replay recorder (rrweb) for test-product landing pages only — see
 * ReplayRecorderMount.tsx for the gating (test product + analytics consent).
 * Batches events client-side and posts them through the existing /next-api
 * proxy pattern, exactly like shopBehavior.ts's trackShopBehavior. Never
 * throws into the host page: every failure mode here is "stop recording
 * quietly", not a broken product page.
 */

const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFERED_EVENTS = 50;
const MAX_BUFFERED_BYTES = 200_000; // soft cap, well under the backend's 2MB hard cap per batch
const SCROLL_THROTTLE_MS = 300;

type MarkerType = "session_start" | "session_end" | "click" | "scroll" | "navigation";
interface Marker {
  type: MarkerType;
  timestampMs: number;
  label?: string | null;
  meta?: Record<string, unknown> | null;
}

function getCartToken(): string | null {
  return localStorage.getItem("shop_cart_token");
}

/** Best-effort short CSS-like path for a click target — for the admin event list, not for replaying. */
function describeTarget(el: Element | null): string {
  if (!el) return "";
  const parts: string[] = [];
  let node: Element | null = el;
  for (let depth = 0; node && depth < 3; depth++) {
    let part = node.tagName.toLowerCase();
    if (node.id) part += `#${node.id}`;
    else if (node.className && typeof node.className === "string") {
      const cls = node.className.trim().split(/\s+/)[0];
      if (cls) part += `.${cls}`;
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

function textLabel(el: Element | null): string | null {
  const text = el?.textContent?.trim();
  return text ? text.slice(0, 80) : null;
}

export interface ReplayRecordingHandle {
  /** Flushes any buffered data and ends the session. Safe to call more than once. */
  stop: () => void;
}

/**
 * Starts a session (server-side gated: excluded IP/bot/non-test-product all
 * silently produce no session — see replay-tracking.service.ts) and, only if
 * one was granted, begins recording. Returns null when nothing was started.
 */
export async function startReplayRecording(productId: string): Promise<ReplayRecordingHandle | null> {
  const { referrer, utmSource } = getTrafficSource();

  let sessionId: string | undefined;
  try {
    const res = await fetch("/next-api/public/shop/replay/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        cartToken: getCartToken(),
        pageUrl: window.location.pathname,
        pageTitle: document.title,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        referrer,
        utmSource,
      }),
    });
    const data = await res.json().catch(() => ({}));
    sessionId = data?.sessionId;
  } catch {
    return null;
  }
  if (!sessionId) return null; // excluded visitor, bot, or not a test product — don't record

  const sid = sessionId;
  const startedAtPerf = performance.now();
  const elapsedMs = () => Math.round(performance.now() - startedAtPerf);

  let eventBuffer: eventWithTime[] = [];
  let markerBuffer: Marker[] = [{ type: "session_start", timestampMs: 0 }];
  let stopped = false;
  let lastScrollFlush = 0;
  let lastScrollPct = -1;

  function bufferedBytes(): number {
    // Cheap estimate — avoids JSON.stringify on every single event push.
    return eventBuffer.length * 400 + markerBuffer.length * 120;
  }

  function flush(useBeacon = false): void {
    if (!eventBuffer.length && !markerBuffer.length) return;
    const body = JSON.stringify({ events: eventBuffer, markers: markerBuffer });
    eventBuffer = [];
    markerBuffer = [];
    const url = "/next-api/public/shop/replay/sessions/" + sid + "/events";
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: useBeacon }).catch(() => {});
    }
  }

  function endSession(): void {
    flush(true);
    const body = JSON.stringify({ markers: [{ type: "session_end", timestampMs: elapsedMs() }] });
    const url = "/next-api/public/shop/replay/sessions/" + sid + "/end";
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  }

  const stopRecording = record({
    emit(event) {
      eventBuffer.push(event);
      if (eventBuffer.length >= MAX_BUFFERED_EVENTS || bufferedBytes() >= MAX_BUFFERED_BYTES) flush();
    },
    // ── Privacy: never capture sensitive form data ──
    // Every input's value is masked by default; the four sensitive input
    // types are masked with a fixed-length placeholder rather than the
    // real character count (real length can itself leak info, e.g. a
    // password's strength or an email's domain length).
    maskAllInputs: true,
    maskInputOptions: { password: true, email: true, tel: true },
    maskTextFn: (text, el) =>
      el?.closest?.('input[type="password"], input[type="email"], input[type="tel"], [data-sensitive]')
        ? "*".repeat(Math.min(text.length, 8))
        : text,
    // Extra, explicit opt-out mechanism beyond input masking: any element
    // (or ancestor) tagged with either class is fully excluded from the
    // recording (blockClass) or has its text replaced (maskTextClass) — see
    // the admin-facing docs comment at the bottom of this file.
    blockClass: "rr-block",
    maskTextClass: "rr-mask",
    inlineStylesheet: true,
    recordCanvas: false,
    sampling: { scroll: SCROLL_THROTTLE_MS, input: "last" },
  });

  const onClick = (e: MouseEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    markerBuffer.push({
      type: "click",
      timestampMs: elapsedMs(),
      label: textLabel(target) ?? describeTarget(target),
      meta: { x: e.clientX, y: e.clientY, selector: describeTarget(target) },
    });
  };

  const onScroll = () => {
    const now = performance.now();
    if (now - lastScrollFlush < SCROLL_THROTTLE_MS) return;
    lastScrollFlush = now;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
    // Only record meaningful movement, not every pixel — keeps the
    // timeline's scroll markers readable instead of a dense smear.
    if (Math.abs(pct - lastScrollPct) < 5) return;
    lastScrollPct = pct;
    markerBuffer.push({ type: "scroll", timestampMs: elapsedMs(), meta: { scrollPct: pct } });
  };

  const onNavigate = () => {
    markerBuffer.push({
      type: "navigation",
      timestampMs: elapsedMs(),
      label: window.location.pathname,
      meta: { path: window.location.pathname },
    });
  };
  // SPA route changes never fire popstate on their own (App Router uses
  // history.pushState directly) — wrap it so a client-side navigation still
  // produces a marker, restored on stop().
  const originalPushState = history.pushState.bind(history);
  history.pushState = ((...args: Parameters<typeof history.pushState>) => {
    originalPushState(...args);
    onNavigate();
  }) as typeof history.pushState;

  document.addEventListener("click", onClick, { capture: true, passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("popstate", onNavigate);

  const flushInterval = window.setInterval(() => flush(), FLUSH_INTERVAL_MS);

  const onHide = () => {
    if (document.visibilityState === "hidden") endSession();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", () => endSession());

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(flushInterval);
    document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("popstate", onNavigate);
    document.removeEventListener("visibilitychange", onHide);
    history.pushState = originalPushState;
    stopRecording?.();
    endSession();
  };

  return { stop };
}

// ── Marking additional elements as private ──
// Any DOM element can be excluded from a replay recording without touching
// this file: add class `rr-block` to fully block it (rendered as an empty
// placeholder box in the replay — for embedded iframes, payment widgets,
// etc.), or `rr-mask` to keep its layout but redact its text content.
// `data-sensitive` on an ancestor also masks any input inside it, same as
// the built-in password/email/tel fields.
