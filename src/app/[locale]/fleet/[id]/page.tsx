import type { JSX } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, type Locale } from "@/lib/i18n";
import CarSlider from "@/components/CarSlider";
import BookingPanel from "./BookingPanel";
import SearchContextBar from "./SearchContextBar";
import styles from "./car-public.module.css";
import ListingIcon from "@/icons/car/ListingIcon";
import CarTypeIcon from "@/icons/car/CarTypeIcon";
import ModelYearIcon from "@/icons/car/ModelYearIcon";
import FuelIcon from "@/icons/car/FuelIcon";
import GearboxIcon from "@/icons/car/GearboxIcon";
import DINIcon from "@/icons/car/DINIcon";
import MileageIcon from "@/icons/car/MileageIcon";
import DoorsCarIcon from "@/icons/car/DoorsCarIcon";
import SeatsCarIcon from "@/icons/car/SeatsCarIcon";
import PaintPaletteIcon from "@/icons/car/PaintPaletteIcon";
import type { Translations } from "@/lib/i18n/translations";

// Data fetches tagged below — revalidated on car/photo mutations, not on a timer.

interface PublicCarDetail {
  id: string;
  name: string;
  description?: string | null;
  isAvailable: boolean;
  brand?: string | null;
  model?: string | null;
  finishing?: string | null;
  modelYear?: number | null;
  vehicleType?: string | null;
  energy?: string | null;
  din?: number | null;
  gearbox?: string | null;
  numberOfDoors?: number | null;
  numberOfSeats?: number | null;
  color?: string | null;
  mileage?: string | null;
  vehicleCondition?: string | null;
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function getCar(id: string, lang: string): Promise<PublicCarDetail | null> {
  try {
    const res = await fetch(
      `${API}/public/cars/${id}?lang=${encodeURIComponent(lang)}`,
      { cache: "force-cache", next: { tags: ["cars", `car-${id}`] } },
    );
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function getPhotos(id: string): Promise<{ id: string }[]> {
  try {
    const res = await fetch(`${API}/public/cars/${id}/photos`, {
      cache: "force-cache",
      next: { tags: [`car-photos-${id}`] },
    });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

// ── Static params: pre-generate a page for each known car ID at build time ────

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API}/public/cars?lang=fr`, { cache: "force-cache" });
    if (!res.ok) return [];
    const cars: { id: string }[] = await res.json();
    return cars.map(car => ({ id: car.id }));
  } catch {
    return [];
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; id: string };
}): Promise<Metadata> {
  const car = await getCar(params.id, params.locale);
  if (!car) return { title: "Vehicle — Vitecamion" };
  const title = [car.brand, car.model, car.finishing].filter(Boolean).join(" ") || car.name;
  return {
    title: `${title} — Vitecamion`,
    description: car.description ?? `Rent the ${title} on Vitecamion.`,
    openGraph: {
      title: `${title} — Vitecamion`,
      description: car.description ?? undefined,
      images: [`/next-api/public/cars/${params.id}/photo`],
    },
  };
}

// ── Spec table ────────────────────────────────────────────────────────────────

const SPEC_ICONS: Record<string, JSX.Element> = {
  type:      <CarTypeIcon />,
  brand:     <ListingIcon />,
  model:     <ListingIcon />,
  finishing: <ListingIcon />,
  year:      <ModelYearIcon />,
  energy:    <FuelIcon />,
  gearbox:   <GearboxIcon />,
  power:     <DINIcon />,
  mileage:   <MileageIcon />,
  doors:     <DoorsCarIcon />,
  seats:     <SeatsCarIcon />,
  color:     <PaintPaletteIcon />,
  condition: <ListingIcon />,
};

type SpecLabels = Translations["carDetail"]["specs"];
type SpecItem = { key: keyof SpecLabels; value: string };

function buildSpecs(car: PublicCarDetail): SpecItem[] {
  const items: (SpecItem | false)[] = [
    !!car.vehicleType    && { key: "type",      value: car.vehicleType },
    !!car.brand          && { key: "brand",     value: car.brand! },
    !!car.model          && { key: "model",     value: car.model! },
    !!car.finishing      && { key: "finishing", value: car.finishing! },
    !!car.modelYear      && { key: "year",      value: String(car.modelYear) },
    !!car.energy         && { key: "energy",    value: car.energy! },
    !!car.gearbox        && { key: "gearbox",   value: car.gearbox! },
    !!car.din            && { key: "power",     value: `${car.din} hp` },
    !!car.mileage        && { key: "mileage",   value: `${car.mileage} km` },
    !!car.numberOfDoors  && { key: "doors",     value: String(car.numberOfDoors) },
    !!car.numberOfSeats  && { key: "seats",     value: String(car.numberOfSeats) },
    !!car.color          && { key: "color",     value: car.color! },
    !!car.vehicleCondition && { key: "condition", value: car.vehicleCondition! },
  ];
  return items.filter(Boolean) as SpecItem[];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CarDetailPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { start?: string; end?: string };
}) {
  const locale = params.locale as Locale;
  const id = params.id;
  const t = getTranslations(locale);
  const [car, photos] = await Promise.all([getCar(id, locale), getPhotos(id)]);

  if (!car) {
    return (
      <div className={styles.notFound}>
        <p>{t.carDetail.notFound}</p>
        <Link href={`/${locale}/fleet`} className={styles.backLink}>
          ← {t.fleet.title}
        </Link>
      </div>
    );
  }

  const specs = buildSpecs(car);
  const photoIds = photos.map(p => p.id);
  const title = [car.brand, car.model, car.finishing].filter(Boolean).join(" ") || car.name;

  return (
    <div className={styles.page}>

      {/* ── Breadcrumb / search context ── */}
      {searchParams.start && searchParams.end ? (
        <SearchContextBar
          start={searchParams.start}
          end={searchParams.end}
          locale={locale}
          backLabel={t.search.backToSearch}
          searchHref={`/${locale}/search?start=${encodeURIComponent(searchParams.start)}&end=${encodeURIComponent(searchParams.end)}`}
        />
      ) : (
        <div className={styles.breadcrumb}>
          <Link href={`/${locale}/fleet`} className={styles.backLink}>
            ← {t.fleet.title}
          </Link>
        </div>
      )}

      {/* ── Photo slider ── */}
      <div className={styles.sliderSection}>
        <CarSlider
          carId={car.id}
          photoIds={photoIds}
          carName={car.name}
          viewPhotoLabel={t.fleet.viewPhoto}
          photosLabel={t.fleet.photos}
        />
        <div className={styles.sliderBadge}>
          <span className={car.isAvailable ? styles.badgeAvail : styles.badgeBusy}>
            {car.isAvailable ? t.fleet.available : t.fleet.rented}
          </span>
        </div>
      </div>

      {/* ── Content: title + specs ── */}
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.carName}>{title}</h1>
            {title !== car.name && <p className={styles.carSub}>{car.name}</p>}
          </div>
        </div>

        {car.description && <p className={styles.description}>{car.description}</p>}

        {specs.length > 0 && (
          <div className={styles.specsSection}>
            <h2 className={styles.specsTitle}>{t.carDetail.specifications}</h2>
            <div className={styles.specsList}>
              {specs.map(s => (
                <div key={s.key} className={styles.specRow}>
                  <span className={styles.specLeft}>
                    <span className={styles.specIcon}>{SPEC_ICONS[s.key]}</span>
                    <span className={styles.specLabel}>{t.carDetail.specs[s.key]}</span>
                  </span>
                  <span className={styles.specValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Booking section – full-bleed highlighted row ── */}
      <section className={styles.bookingSection} aria-label={t.booking.title}>
        <div className={styles.bookingInner}>
          <div className={styles.bookingSectionHead}>
            <p className={styles.bookingSectionEyebrow}>{t.booking.title}</p>
            <h2 className={styles.bookingSectionTitle}>{title}</h2>
          </div>
          <BookingPanel
            carId={car.id}
            locale={locale}
            labels={t.booking}
            initialStart={searchParams.start}
            initialEnd={searchParams.end}
          />
        </div>
      </section>
    </div>
  );
}
