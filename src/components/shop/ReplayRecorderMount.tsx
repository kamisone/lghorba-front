"use client";

import { useEffect, useRef } from "react";
import { useCookieConsent } from "@/components/consent/CookieConsentContext";
import { startReplayRecording, type ReplayRecordingHandle } from "@/lib/replayRecorder";

interface Props {
  productId: string;
  /** Server-resolved — this component still no-ops without it as defense in depth. */
  isTestProduct: boolean;
}

/**
 * Mounts the session-replay recorder on a test-product landing page. Scoped
 * to test products only (see replay-tracking.service.ts for the matching
 * server-side enforcement) — a deliberate privacy-minimization choice: test
 * products can't be purchased and draw a small, controlled audience, unlike
 * ordinary shoppers moving through checkout with real PII on-screen.
 *
 * Gated on analytics consent (front/src/lib/cookieConsent.ts), same pattern
 * as MetaPixelLoader.tsx: nothing starts before consent is granted, and
 * withdrawal simply means canRecord goes false again — a recording already
 * in flight for this tab keeps running (rrweb has no supported hard-stop
 * mid-batch either), but no *new* session is ever started without consent.
 */
export default function ReplayRecorderMount({ productId, isTestProduct }: Props) {
  const { consent } = useCookieConsent();
  const handleRef = useRef<ReplayRecordingHandle | null>(null);
  const startedRef = useRef(false);

  const canRecord = isTestProduct && consent?.analytics === true;

  useEffect(() => {
    if (!canRecord || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    startReplayRecording(productId).then((handle) => {
      if (cancelled) handle?.stop();
      else handleRef.current = handle;
    });
    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRecord, productId]);

  return null;
}
