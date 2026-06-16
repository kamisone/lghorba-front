"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import { type SelectedAddress } from "@/components/AddressAutocomplete";
import { api, type CouponValidationResult } from "@/lib/api";
import { type PriceResult } from "./useBookingPricing";
import { type DeliveryLocationOption, type DeliveryValidation } from "./useDeliveryMode";

export type { CouponValidationResult } from "@/lib/api";

type ValidationMessages = ReturnType<typeof getTranslations>["booking"]["validation"];

function validateField(field: "name" | "email" | "phone", value: string, v: ValidationMessages): string {
  const s = value.trim();
  if (field === "name")  return s ? "" : v.nameRequired;
  if (field === "phone") {
    if (!s) return v.phoneRequired;
    if (s.replace(/\D/g, "").length < 6) return v.phoneInvalid;
    return "";
  }
  if (field === "email") {
    if (!s) return v.emailRequired;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return v.emailInvalid;
    return "";
  }
  return "";
}


interface Deps {
  carId:              string;
  locale:             string;
  startISO:           string;
  endISO:             string;
  available:          boolean | null;
  priceResult:        PriceResult | null;
  deliveryEnabled:    boolean;
  deliveryMode:       "pickup" | "delivery";
  deliveryType:       "radius" | "location" | null;
  deliveryAddress:    SelectedAddress | null;
  deliveryValidation: DeliveryValidation | null;
  selectedLocationId: string | null;
  deliveryLocations:  DeliveryLocationOption[];
  activeDeliveryFee:  number;
}

export function useBookingForm(deps: Deps) {
  const router = useRouter();
  const t = getTranslations(deps.locale);
  const {
    carId, locale, startISO, endISO, available, priceResult,
    deliveryEnabled, deliveryMode, deliveryType, deliveryAddress,
    deliveryValidation, selectedLocationId, deliveryLocations, activeDeliveryFee,
  } = deps;

  const [name,        setName]        = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email,       setEmail]       = useState("");
  const [phone,       setPhone]       = useState("");

  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", phone: "" });
  const [touched,     setTouched]     = useState({ name: false, email: false, phone: false });

  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [couponCode,     setCouponCode]     = useState("");
  const [couponResult,   setCouponResult]   = useState<CouponValidationResult | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const couponTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear stale submit error when the user picks new dates
  useEffect(() => { setSubmitError(""); }, [startISO, endISO]);

  // Debounced coupon validation — reruns when code, price, or delivery fee changes
  useEffect(() => {
    if (couponTimerRef.current) clearTimeout(couponTimerRef.current);
    if (!couponCode.trim() || !priceResult) { setCouponResult(null); return; }
    const subtotal    = priceResult.totalPrice;
    const deliveryFee = activeDeliveryFee;
    const days        = priceResult.numberOfDays;
    couponTimerRef.current = setTimeout(async () => {
      setCouponChecking(true);
      try {
        const result = await api.promotions.validate({ code: couponCode.trim(), carId, subtotal, deliveryFee, days });
        setCouponResult(result);
      } catch {
        setCouponResult(null);
      } finally {
        setCouponChecking(false);
      }
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, priceResult, activeDeliveryFee, carId]);

  function validate(field: "name" | "email" | "phone", value: string): string {
    return validateField(field, value, t.booking.validation);
  }

  const handleBook = async () => {
    if (!startISO || !endISO || !available || !priceResult) return;

    const errors = {
      name:  validate("name",  name),
      email: validate("email", email),
      phone: validate("phone", phone),
    };
    setFieldErrors(errors);
    setTouched({ name: true, email: true, phone: true });
    if (errors.name || errors.email || errors.phone) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const selectedLoc = deliveryLocations.find(l => l.id === selectedLocationId);
      let deliveryPayload: Record<string, unknown> = {};
      if (deliveryEnabled && deliveryMode === "delivery") {
        if (deliveryType === "location" && selectedLoc) {
          deliveryPayload = {
            deliveryRequested:  true,
            deliveryAddress:    selectedLoc.address,
            deliveryAddressLat: selectedLoc.lat,
            deliveryAddressLng: selectedLoc.lng,
          };
        } else if (deliveryType === "radius" && deliveryAddress && deliveryValidation?.available) {
          deliveryPayload = {
            deliveryRequested:  true,
            deliveryAddress:    deliveryAddress.label,
            deliveryAddressLat: deliveryAddress.lat,
            deliveryAddressLng: deliveryAddress.lng,
          };
        }
      }
      const data = await api.bookings.create({
        carId,
        startDateTime:       startISO,
        endDateTime:         endISO,
        customerName:        name.trim(),
        customerCompanyName: companyName.trim() || undefined,
        customerEmail:       email.trim(),
        customerPhone:       phone.trim(),
        ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
        ...deliveryPayload as object,
      });
      sessionStorage.setItem(`stripe_cs_${data.id}`, data.clientSecret);
      router.push(`/${locale}/fleet/${carId}/payment?bookingId=${data.id}`);
    } catch (err) {
      const { ApiError } = await import("@/lib/api");
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | null;
        setSubmitError(body?.message ?? t.booking.genericError);
      } else {
        setSubmitError(t.booking.networkError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
    name, setName, companyName, setCompanyName,
    email, setEmail, phone, setPhone,
    fieldErrors, setFieldErrors,
    touched, setTouched,
    submitting, submitError,
    couponCode, setCouponCode,
    couponResult, setCouponResult,
    couponChecking,
    validate,
    handleBook,
  };
}
