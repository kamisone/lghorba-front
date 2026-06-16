// ── Error ─────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err  = new ApiError(res.status, body);
    if (res.status >= 500 && typeof window !== "undefined") {
      import("./errorReporter").then(({ reportError }) => reportError(err, { url, context: `api:${res.status}` }));
    }
    throw err;
  }
  return res.json() as Promise<T>;
}

function get<T>(url: string, init?: RequestInit): Promise<T> {
  return request<T>(url, init);
}

function post<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });
}

function patch<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del(url: string): Promise<void> {
  return request<void>(url, { method: "DELETE" });
}

// ── Shared types ──────────────────────────────────────────────────────────────

export interface PriceBreakdownItem {
  startDate:   string;
  endDate:     string;
  pricePerDay: number;
  days:        number;
  subtotal:    number;
  label:       string | null;
}

export interface PriceResult {
  totalPrice:      number;
  numberOfDays:    number;
  breakdown:       PriceBreakdownItem[];
  basePricePerDay: number | null;
}

export interface AvailabilityResult {
  available: boolean;
}

export interface DeliveryValidation {
  available: boolean;
  fee:       number | null;
}

export interface CreateBookingPayload {
  carId:               string;
  startDateTime:       string;
  endDateTime:         string;
  customerName:        string;
  customerCompanyName?: string;
  customerEmail:       string;
  customerPhone:       string;
  couponCode?:         string;
  deliveryRequested?:  boolean;
  deliveryAddress?:    string;
  deliveryAddressLat?: number;
  deliveryAddressLng?: number;
}

export interface BookingCreatedResult {
  id:           string;
  clientSecret: string;
  message?:     string;
}

export interface ValidatePromoPayload {
  code:        string;
  carId:       string;
  subtotal:    number;
  deliveryFee: number;
  days:        number;
}

export type CouponValidationResult =
  | { valid: true;  discountAmount: number; finalPrice: number; code: string | null; name: string }
  | { valid: false; error: string };

// ── Route constants ───────────────────────────────────────────────────────────

const R = {
  // Public — cars
  publicCarAvailability: (id: string) => `/next-api/public/cars/${id}/availability`,
  publicCarPrice:        (id: string) => `/next-api/public/cars/${id}/price`,
  publicCarDelivery:     (id: string) => `/next-api/public/cars/${id}/delivery/validate`,
  // Public — bookings
  publicBookings:        "/next-api/public/bookings",
  publicBooking:         (id: string) => `/next-api/public/bookings/${id}`,
  // Public — promotions
  publicPromoValidate:   "/next-api/public/promotions/validate",
  // Admin — cars
  cars:                  "/next-api/cars",
  car:                   (id: string) => `/next-api/cars/${id}`,
  // Admin — bookings
  bookings:              "/next-api/bookings",
  booking:               (id: string) => `/next-api/bookings/${id}`,
  bookingCalendar:       (carId: string) => `/next-api/bookings/calendar?carId=${carId}`,
  // Admin — reminders
  reminderFailedLogs:    "/next-api/notifications/reminders/logs?status=failed&limit=50",
} as const;

// ── API client ────────────────────────────────────────────────────────────────

export const api = {

  // ── Public — cars ───────────────────────────────────────────────────────────

  cars: {
    list: () =>
      get<{ id: string; name: string; brand?: string | null; model?: string | null; immatriculation?: string | null }[]>(R.cars),

    getById: (id: string) =>
      get<{ id: string; name: string; immatriculation: string }>(R.car(id)),

    checkAvailability: (carId: string, start: string, end: string) =>
      get<AvailabilityResult>(
        `${R.publicCarAvailability(carId)}?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`,
      ),

    getPrice: (carId: string, start: string, end: string, signal?: AbortSignal) =>
      get<PriceResult>(
        `${R.publicCarPrice(carId)}?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`,
        signal ? { signal } : undefined,
      ),

    validateDelivery: (
      carId: string,
      payload: { addressLat: number; addressLng: number; addressLabel: string },
      signal?: AbortSignal,
    ) =>
      post<DeliveryValidation>(R.publicCarDelivery(carId), payload, { signal }),
  },

  // ── Public — bookings ───────────────────────────────────────────────────────

  bookings: {
    create: (payload: CreateBookingPayload) =>
      post<BookingCreatedResult>(R.publicBookings, payload),

    getById: (id: string) =>
      get<{ id: string; status: string; startDateTime: string; endDateTime: string }>(R.publicBooking(id)),
  },

  // ── Public — promotions ─────────────────────────────────────────────────────

  promotions: {
    validate: (payload: ValidatePromoPayload) =>
      post<CouponValidationResult>(R.publicPromoValidate, payload),
  },

  // ── Admin — cars ────────────────────────────────────────────────────────────

  admin: {
    cars: {
      list: () =>
        get<{ id: string; name: string; brand?: string | null; model?: string | null; immatriculation?: string | null }[]>(R.cars, { cache: "no-store" }),
    },

    // ── Admin — bookings ──────────────────────────────────────────────────────

    bookings: {
      list: (params?: { limit?: number }) =>
        get<{ id: string; status: string }[]>(
          params?.limit ? `${R.bookings}?limit=${params.limit}` : R.bookings,
          { cache: "no-store" },
        ),

      getById: (id: string) =>
        get<{ id: string; status: string; startDateTime: string; endDateTime: string }>(R.booking(id)),

      update: (id: string, body: Record<string, unknown>) =>
        patch<{ id: string; status: string }>(R.booking(id), body),

      delete: (id: string) =>
        del(R.booking(id)),

      calendarByCar: (carId: string) =>
        get<unknown[]>(R.bookingCalendar(carId)),
    },

    // ── Admin — reminders ─────────────────────────────────────────────────────

    reminders: {
      failedLogs: () =>
        get<{ total?: number; items?: unknown[] }>(R.reminderFailedLogs, { cache: "no-store" }),
    },
  },
};
