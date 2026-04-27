import Link from "next/link";
import { getTranslations, type Locale } from "@/lib/i18n";
import styles from "./booking-confirmation.module.css";

interface BookingDetail {
  id: string;
  carId: string;
  startDate: string;
  endDate: string;
  totalPrice: string | number;
  status: "pending" | "confirmed" | "cancelled";
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

function fmt(date: string) {
  return new Date(date + "T00:00:00Z").toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
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
          <p className={styles.errorText}>Booking not found.</p>
          <Link href={`/${locale}/fleet`} className={styles.backLink}>
            {t.booking.backToFleet}
          </Link>
        </div>
      </div>
    );
  }

  const carName = booking.car?.name ?? "";
  const totalPrice = typeof booking.totalPrice === "string"
    ? parseFloat(booking.totalPrice)
    : booking.totalPrice;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Icon */}
        <div className={styles.iconWrap} aria-hidden="true">
          <span className={styles.checkIcon}>✓</span>
        </div>

        <h1 className={styles.title}>{t.booking.confirmTitle}</h1>
        <p className={styles.sub}>{t.booking.confirmSub}</p>

        {/* Details */}
        <div className={styles.detailsGrid}>
          {carName && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Vehicle</span>
              <span className={styles.detailValue}>{carName}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t.booking.confirmDates}</span>
            <span className={styles.detailValue}>
              {fmt(booking.startDate)} → {fmt(booking.endDate)}
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
              {booking.status === "pending"   ? t.booking.confirmPending  : booking.status}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/${locale}/fleet/${params.id}`} className={styles.backBtn}>
            ← Back to vehicle
          </Link>
          <Link href={`/${locale}/fleet`} className={styles.fleetBtn}>
            {t.booking.backToFleet}
          </Link>
        </div>
      </div>
    </div>
  );
}
