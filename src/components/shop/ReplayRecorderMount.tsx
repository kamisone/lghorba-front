"use client";

import { useEffect, useRef } from "react";
import { useCookieConsent } from "@/components/consent/CookieConsentContext";
import { startReplayRecording } from "@/lib/replayRecorder";

interface Props {
  productId: string;
  /** Server-resolved — this component still no-ops without it as defense in depth. */
  isTestProduct: boolean;
}

/**
 * Starts the session-replay recorder on a test-product landing page. Scoped
 * to test products only (see replay-tracking.service.ts for the matching
 * server-side enforcement) — a deliberate privacy-minimization choice: test
 * products can't be purchased and draw a small, controlled audience, unlike
 * ordinary shoppers moving through checkout with real PII on-screen.
 *
 * Gated on analytics consent (front/src/lib/cookieConsent.ts), same pattern
 * as MetaPixelLoader.tsx: nothing starts before consent is granted.
 *
 * Deliberately does NOT stop the recording on unmount. The recorder is a
 * module-level singleton (see replayRecorder.ts) attached to `document`/
 * `window`, not to this component — a client-side navigation away from the
 * product page (e.g. to /shop/checkout, so that page is captured too) or a
 * consent-state change both unmount/re-run this component, but neither
 * should end an in-flight recording. It only ends on the recorder's own
 * tab-close/hidden signals.
 */
export default function ReplayRecorderMount({ productId, isTestProduct }: Props) {
  const { consent } = useCookieConsent();
  const startedRef = useRef(false);

  const canRecord = isTestProduct && consent?.analytics === true;

  useEffect(() => {
    if (!canRecord || startedRef.current) return;
    startedRef.current = true;
    startReplayRecording(productId);
  }, [canRecord, productId]);

  return null;
}
