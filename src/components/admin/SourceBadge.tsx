import styles from "./SourceBadge.module.css";

export type BookingSource = "private" | "turo" | "getaround";

const SOURCE_LABELS: Record<BookingSource, string> = {
  private: "Private", turo: "Turo", getaround: "Getaround",
};

/**
 * Booking-source pill (Private / Turo / Getaround). Shared by the bookings
 * list and every rent-session view so a session is always labelled with
 * the platform its booking came from.
 */
export default function SourceBadge({ source, size = "md" }: { source: BookingSource; size?: "sm" | "md" }) {
  return (
    <span className={`${styles.badge} ${size === "sm" ? styles.sm : ""} ${styles[`source_${source}`]}`}>
      {SOURCE_LABELS[source]}
    </span>
  );
}
