"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CheckoutSession {
  cartToken: string;
  step: string;
  formSnapshot: Record<string, string> | null;
  locale: string;
  orderId: string | null;
  resumeToken: string;
  expiresAt: string;
  completedAt: string | null;
}

const DEFAULT_FORM = {
  email: "", firstName: "", lastName: "", companyName: "", phone: "",
  line1: "", line2: "", city: "", zip: "", country: "MA",
};

export default function CheckoutResumePage({
  params,
}: {
  params: { locale: string; token: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resume() {
      // 1. Fetch session by resume token
      const sessionRes = await fetch(`/next-api/public/shop/checkout/resume/${params.token}`);
      if (!sessionRes.ok) {
        const body = await sessionRes.json().catch(() => ({}));
        throw new Error((body as any).message ?? "This link has expired or has already been used.");
      }
      const session = (await sessionRes.json()) as CheckoutSession;

      // 2. Build the form from saved snapshot
      const savedForm = session.formSnapshot ?? {};
      const form = {
        email:       savedForm.email       ?? "",
        firstName:   savedForm.firstName   ?? "",
        lastName:    savedForm.lastName    ?? "",
        companyName: savedForm.companyName ?? "",
        phone:       savedForm.phone       ?? "",
        line1:       savedForm.line1       ?? "",
        line2:       savedForm.line2       ?? "",
        city:        savedForm.city        ?? "",
        zip:         savedForm.zip         ?? "",
        country:     savedForm.country     ?? "MA",
      };

      // 3. If an order was created, re-fetch the full snapshot so the checkout
      //    page can render the shipping/payment step without re-submitting the form
      let snapshot = null;
      let selectedMethodId = null;
      if (session.orderId) {
        try {
          const snapRes = await fetch(`/next-api/public/shop/checkout/${session.orderId}`);
          if (snapRes.ok) {
            snapshot = await snapRes.json();
            selectedMethodId = snapshot?.shippingMethodId ?? null;
          }
        } catch {
          // If snapshot fetch fails, fall back to address step
        }
      }

      // 4. Determine the step to restore
      //    If snapshot is unavailable (order expired/cancelled), go back to address
      const step = snapshot
        ? (session.step === "complete" ? "address" : session.step)
        : "address";

      // 5. Write session state into sessionStorage so the checkout page picks it up
      const persistKey = `checkout:${session.cartToken}`;
      try {
        sessionStorage.setItem(persistKey, JSON.stringify({
          step,
          form,
          snapshot,
          selectedMethodId,
          clientSecret: null, // Re-fetched by checkout page for payment step
        }));
      } catch {}

      // 6. Set the cart token so CartContext loads the right cart
      try {
        localStorage.setItem("shop_cart_token", session.cartToken);
      } catch {}

      router.replace(`/${params.locale}/shop/checkout`);
    }

    resume().catch((err: Error) => setError(err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 16px" }}>
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#dc2626" }}>{error}</p>
        <a
          href={`/${params.locale}/shop`}
          style={{ color: "#1d4ed8", textDecoration: "underline" }}
        >
          Return to shop
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 16px" }}>
      <p style={{ color: "#6b7280" }}>Resuming your checkout…</p>
    </div>
  );
}
