import { notFound } from "next/navigation";
import PaymentForm from "./PaymentForm";
import styles from "./payment.module.css";

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

interface BookingDetail {
  id: string;
  carId: string;
  startDateTime: string;
  endDateTime: string;
  totalPrice: string | number;
  status: string;
  car?: { id: string; name: string } | null;
}

async function getBooking(bookingId: string): Promise<BookingDetail | null> {
  try {
    const res = await fetch(`${API}/public/bookings/${bookingId}`, { cache: "no-store" });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { bookingId?: string };
}) {
  const { locale, id: carId } = params;
  const bookingId = searchParams.bookingId;

  if (!bookingId) notFound();

  const booking = await getBooking(bookingId);
  if (!booking) notFound();

  // If payment already completed, skip to confirmation
  if (booking.status === "confirmed" || booking.status === "cancelled") {
    const { redirect } = await import("next/navigation");
    redirect(`/${locale}/fleet/${carId}/booking-confirmation?bookingId=${bookingId}`);
  }

  const totalPrice = typeof booking.totalPrice === "string"
    ? parseFloat(booking.totalPrice)
    : booking.totalPrice;

  return (
    <div className={styles.page}>
      <PaymentForm
        bookingId={bookingId}
        carId={carId}
        locale={locale}
        totalPrice={totalPrice}
        carName={booking.car?.name ?? ""}
        startDateTime={booking.startDateTime}
        endDateTime={booking.endDateTime}
      />
    </div>
  );
}
