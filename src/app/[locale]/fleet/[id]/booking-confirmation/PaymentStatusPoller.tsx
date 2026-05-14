"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Props {
  bookingId: string;
  intervalMs?: number;
}

export default function PaymentStatusPoller({ bookingId, intervalMs = 3000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const data = await api.bookings.getById(bookingId);
        if (data.status === "confirmed" || data.status === "cancelled") {
          router.refresh();
        }
      } catch { /* silent */ }
    }, intervalMs);

    return () => clearInterval(id);
  }, [bookingId, intervalMs, router]);

  return null;
}
