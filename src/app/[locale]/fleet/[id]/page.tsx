import type { JSX } from "react";
import Link from "next/link";
import { getTranslations, type Locale } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import NavHamburger from "@/components/NavHamburger";
import CarSlider from "@/components/CarSlider";
import styles from "./car-public.module.css";
import landingStyles from "../../../page.module.css";
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
      `${API}/api/public/cars/${id}?lang=${encodeURIComponent(lang)}`,
      { cache: "no-store" },
    );
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function getPhotos(id: string): Promise<{ id: string }[]> {
  try {
    const res = await fetch(`${API}/api/public/cars/${id}/photos`, { cache: "no-store" });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

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

export default async function CarDetailPage({ params }: { params: { locale: string; id: string } }) {
  const locale = params.locale as Locale;
  const id = params.id;
  const t = getTranslations(locale);
  const [car, photos] = await Promise.all([getCar(id, locale), getPhotos(id)]);

  if (!car) {
    return (
      <div className={styles.notFound}>
        <p>Vehicle not found.</p>
        <Link href={`/${locale}/fleet`} className={styles.backLink}>
          ← {t.fleet.title}
        </Link>
      </div>
    );
  }

  const specs = buildSpecs(car);
  const photoIds = photos.map((p) => p.id);
  const title = [car.brand, car.model, car.finishing].filter(Boolean).join(" ") || car.name;

  return (
    <div className={styles.page}>
      {/* ── Navbar ── */}
      <header className={landingStyles.navbar}>
        <div className={landingStyles.navInner}>
          <Link href={`/${locale}`} className={landingStyles.logo}>
            <span className={landingStyles.logoIcon}>🚐</span>
            <span className={landingStyles.logoText}>vitecamion</span>
          </Link>
          <nav className={landingStyles.navLinks}>
            <Link href={`/${locale}`} className={landingStyles.navLink}>
              {t.nav.home}
            </Link>
            <Link href={`/${locale}/fleet`} className={landingStyles.navLink}>
              {t.nav.bookNow}
            </Link>
            <Link href={`/${locale}/contact`} className={landingStyles.navLink}>
              {t.nav.contact}
            </Link>
          </nav>
          <div className={landingStyles.navRight}>
            <LangSwitcher locale={locale} />
            <NavHamburger
              links={[
                { href: `/${locale}`,         label: t.nav.home },
                { href: `/${locale}/fleet`,   label: t.nav.bookNow },
                { href: `/${locale}/contact`, label: t.nav.contact },
              ]}
              ctaLabel={t.nav.bookNow}
            />
          </div>
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumb}>
        <Link href={`/${locale}/fleet`} className={styles.backLink}>
          ← {t.fleet.title}
        </Link>
      </div>

      {/* ── Photo slider ── */}
      <div className={styles.sliderSection}>
        <CarSlider carId={car.id} photoIds={photoIds} carName={car.name} />
        <div className={styles.sliderBadge}>
          <span className={car.isAvailable ? styles.badgeAvail : styles.badgeBusy}>
            {car.isAvailable ? t.fleet.available : t.fleet.rented}
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className={styles.content}>
        {/* Title + CTA row */}
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.carName}>{title}</h1>
            {title !== car.name && <p className={styles.carSub}>{car.name}</p>}
          </div>
          <Link href={`/${locale}/contact`} className={styles.bookBtn}>
            {t.nav.bookNow}
          </Link>
        </div>

        {/* Translated description */}
        {car.description && <p className={styles.description}>{car.description}</p>}

        {/* Specs list */}
        {specs.length > 0 && (
          <div className={styles.specsSection}>
            <h2 className={styles.specsTitle}>{t.carDetail.specifications}</h2>
            <div className={styles.specsList}>
              {specs.map((s) => (
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

        {/* Bottom CTA */}
        <div className={styles.ctaSection}>
          <p className={styles.ctaText}>{t.carDetail.interested}</p>
          <Link href={`/${locale}/contact`} className={styles.bookBtnLarge}>
            {t.nav.bookNow}
          </Link>
        </div>
      </div>
    </div>
  );
}
