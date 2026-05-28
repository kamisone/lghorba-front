import Image from "next/image";
import Link from "next/link";
import { Car } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import type { FleetCar } from "./FleetGrid";
import CarPriceSlot from "./CarPriceSlot";
import styles from "./fleet.module.css";

interface Props {
  car:    FleetCar;
  locale: string;
}

export default function CarCard({ car, locale }: Props) {
  const t = getTranslations(locale);

  const enums = t.carEnums;
  const availableFromLabel = car.nextAvailableDate
    ? `${t.fleet.availableFrom} ${new Date(car.nextAvailableDate + "T00:00:00Z").toLocaleDateString(
        locale,
        { day: "numeric", month: "short", timeZone: "UTC" },
      )}`
    : t.fleet.availableFrom;

  return (
    <Link href={`/${locale}/fleet/${car.id}`} className={styles.card}>
      <div className={styles.photoWrap}>
        {car.hasPhoto ? (
          <Image
            src={`/next-api/public/cars/${car.id}/photo`}
            alt={car.name}
            fill
            className={styles.photo}
            sizes="(max-width: 768px) 100vw, 340px"
          />
        ) : (
          <div className={styles.photoPlaceholder}><Car size={16} strokeWidth={1.75} /></div>
        )}
        {car.isAvailable ? (
          <span className={`${styles.badge} ${styles.badgeAvail}`}>{t.fleet.availableToday}</span>
        ) : (
          <span className={`${styles.badge} ${styles.badgeFrom}`}>{availableFromLabel}</span>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.infoTop}>
          <h2 className={styles.carName}>{car.name}</h2>
          <CarPriceSlot carId={car.id} locale={locale} />
        </div>

        {car.description && <p className={styles.carDesc}>{car.description}</p>}

        {(car.vehicleType || car.energy || car.gearbox || car.numberOfSeats || car.mileage) && (
          <div className={styles.specs}>
            {car.vehicleType   && <span className={styles.spec}>{enums.vehicleTypeMap[car.vehicleType] ?? car.vehicleType}</span>}
            {car.energy        && <span className={styles.spec}>{enums.energyMap[car.energy] ?? car.energy}</span>}
            {car.gearbox       && <span className={styles.spec}>{enums.gearboxMap[car.gearbox] ?? car.gearbox}</span>}
            {car.numberOfSeats && <span className={styles.spec}>{car.numberOfSeats} {t.fleet.seats}</span>}
            {car.mileage       && <span className={styles.spec}>{car.mileage} {t.fleet.km}</span>}
          </div>
        )}

        <span className={styles.cta}>{t.carDetail.viewDetails}</span>
      </div>
    </Link>
  );
}
