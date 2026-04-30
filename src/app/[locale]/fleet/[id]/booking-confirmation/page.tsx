import Link from "next/link";
import { getTranslations, type Locale } from "@/lib/i18n";
import PaymentStatusPoller from "./PaymentStatusPoller";
import styles from "./booking-confirmation.module.css";

interface BookingDetail {
  id: string;
  carId: string;
  startDateTime: string;
  endDateTime: string;
  totalPrice: string | number;
  status: "pending_payment" | "pending" | "confirmed" | "cancelled";
  car?: { name: string };
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function getBooking(bookingId: string): Promise<BookingDetail | null> {
  try {
    const res = await fetch(`${API}/api/public/bookings/${bookingId}`, { cache: "no-store" });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { bookingId?: string };
}) {
  const locale = params.locale as Locale;
  const t = getTranslations(locale);
  const bookingId = searchParams.bookingId;

  const booking = bookingId ? await getBooking(bookingId) : null;

  if (!booking) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.errorText}>{t.booking.notFound}</p>
          <Link href={`/${locale}/fleet`} className={styles.backLink}>
            {t.booking.backToFleet}
          </Link>
        </div>
      </div>
    );
  }

  const carName    = booking.car?.name ?? "";
  const totalPrice = typeof booking.totalPrice === "string"
    ? parseFloat(booking.totalPrice)
    : booking.totalPrice;
  const isPendingPayment = booking.status === "pending_payment";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {isPendingPayment && <PaymentStatusPoller bookingId={booking.id} />}

        {/* Icon */}
        <div className={`${styles.iconWrap} ${isPendingPayment ? styles.iconWrapPending : ""}`} aria-hidden="true">
          <span className={styles.checkIcon}>{isPendingPayment ? "⏳" : "✓"}</span>
        </div>

        <h1 className={styles.title}>
          {isPendingPayment ? t.booking.paymentProcessing : t.booking.confirmTitle}
        </h1>
        <p className={styles.sub}>
          {isPendingPayment ? t.booking.paymentConfirmingDesc : t.booking.confirmSub}
        </p>

        {/* Details */}
        <div className={styles.detailsGrid}>
          {carName && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t.payment.vehicle}</span>
              <span className={styles.detailValue}>{carName}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t.booking.confirmDates}</span>
            <span className={styles.detailValue}>
              {fmtDT(booking.startDateTime)} → {fmtDT(booking.endDateTime)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t.booking.confirmTotal}</span>
            <span className={`${styles.detailValue} ${styles.detailPrice}`}>
              €{totalPrice.toFixed(2)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t.booking.confirmStatus}</span>
            <span className={`${styles.statusPill} ${styles[`status_${booking.status}`]}`}>
              {booking.status === "pending" ? t.booking.confirmPending : booking.status}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/${locale}/fleet/${params.id}`} className={styles.backBtn}>
            {t.booking.backToVehicle}
          </Link>
          <Link href={`/${locale}/fleet`} className={styles.fleetBtn}>
            {t.booking.backToFleet}
          </Link>
        </div>
      </div>
    </div>
  );
}
