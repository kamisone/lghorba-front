"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingId: string;
  intervalMs?: number;
}

export default function PaymentStatusPoller({ bookingId, intervalMs = 3000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/next-api/public/bookings/${bookingId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "confirmed" || data.status === "cancelled") {
          router.refresh();
        }
      } catch { /* silent */ }
    }, intervalMs);

    return () => clearInterval(id);
  }, [bookingId, intervalMs, router]);

  return null;
}
