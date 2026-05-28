import type { JSX } from "react";
import type { Metadata } from "next";
import { MapPin, Truck } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { getTranslations, type Locale } from "@/lib/i18n";
import { probeNextAvailableDate } from "@/lib/probeNextAvailable";
import CarSlider from "@/components/CarSlider";
import BookingPanel from "./BookingPanel";
import SearchContextBar from "./SearchContextBar";
import ShareVehicle from "./ShareVehicle";
import BookingOptions from "./BookingOptions";
import VehicleFaqAccordion, { type FaqItem } from "@/components/VehicleFaqAccordion";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
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

interface DeliveryLocation {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  radiusKm: number;
  price: number | null;
}

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
  parkingAddress?: string | null;
  deliveryEnabled?: boolean;
  deliveryType?: "radius" | "location" | null;
  deliveryRadiusKm?: number | null;
  deliveryRadiusPrice?: number | null;
  deliveryLocations?: DeliveryLocation[];
  turoLink?: string | null;
  getaroundLink?: string | null;
}

const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

async function getBusinessTimezone(): Promise<string> {
  try {
    const res = await fetch(`${API}/public/platform-settings`, { cache: "no-store" });
    if (!res.ok) return "Europe/Paris";
    const data = await res.json() as { timezone?: string };
    return data.timezone ?? "Europe/Paris";
  } catch {
    return "Europe/Paris";
  }
}

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

async function getFaqs(id: string, lang: string): Promise<FaqItem[]> {
  try {
    const res = await fetch(
      `${API}/public/vehicle-faqs?entityType=car&entityId=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`,
      { cache: "force-cache", next: { tags: [`car-faqs-${id}`] } },
    );
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

function resolveSiteUrl(): string {
  const h = headers();
  const host = h.get("host") ?? "vitecamion.com";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; id: string };
}): Promise<Metadata> {
  const t   = getTranslations(params.locale as Locale);
  const car = await getCar(params.id, params.locale);
  if (!car) return { title: `${t.meta.vehicleFallback} — Vitecamion` };

  const title   = [car.brand, car.model, car.finishing].filter(Boolean).join(" ") || car.name;
  const desc    = car.description ?? `${t.meta.carDescPrefix}${title}${t.meta.carDescSuffix}`;
  const siteUrl = resolveSiteUrl();
  const pageUrl = `${siteUrl}/${params.locale}/fleet/${params.id}`;
  const ogImage = `${siteUrl}/next-api/public/cars/${params.id}/photo`;
  const ogLocale = params.locale === "fr" ? "fr_FR" : "en_US";

  return {
    title: `${title} — Vitecamion`,
    description: desc,
    alternates: {
      canonical: pageUrl,
      languages: {
        "fr": `${siteUrl}/fr/fleet/${params.id}`,
        "en": `${siteUrl}/en/fleet/${params.id}`,
      },
    },
    openGraph: {
      title: `${title} — Vitecamion`,
      description: desc,
      url: pageUrl,
      siteName: "Vitecamion",
      type: "website",
      locale: ogLocale,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Vitecamion`,
      description: desc,
      images: [ogImage],
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
type SpecItem   = { key: keyof SpecLabels; value: string };
type CarEnums   = Translations["carEnums"];

// Translate a categorical DB value through a locale map; fall back to the
// stored value so unknown / future enum entries are never silently swallowed.
const tv = (map: Record<string, string>, v: string): string => map[v] || v;

function buildSpecs(
  car:       PublicCarDetail,
  powerUnit: string,
  kmUnit:    string,
  enums:     CarEnums,
): SpecItem[] {
  const items: (SpecItem | false)[] = [
    !!car.vehicleType    && { key: "type",      value: tv(enums.vehicleTypeMap, car.vehicleType) },
    !!car.brand          && { key: "brand",     value: car.brand! },
    !!car.model          && { key: "model",     value: car.model! },
    !!car.finishing      && { key: "finishing", value: car.finishing! },
    !!car.modelYear      && { key: "year",      value: String(car.modelYear) },
    !!car.energy         && { key: "energy",    value: tv(enums.energyMap, car.energy!) },
    !!car.gearbox        && { key: "gearbox",   value: tv(enums.gearboxMap, car.gearbox!) },
    !!car.din            && { key: "power",     value: `${car.din} ${powerUnit}` },
    !!car.mileage        && { key: "mileage",   value: `${car.mileage} ${kmUnit}` },
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
  const [car, photos, businessTz, faqs] = await Promise.all([
    getCar(id, locale),
    getPhotos(id),
    getBusinessTimezone(),
    getFaqs(id, locale),
  ]);

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

  const nextAvailableDate = car.isAvailable
    ? null
    : await probeNextAvailableDate(car.id).catch(() => null);

  const availableFromLabel = nextAvailableDate
    ? `${t.fleet.availableFrom} ${new Date(nextAvailableDate + "T00:00:00Z").toLocaleDateString(
        locale,
        { day: "numeric", month: "short", timeZone: "UTC" },
      )}`
    : null;

  const specs = buildSpecs(car, t.carDetail.specs.powerUnit, t.fleet.km, t.carEnums);
  const photoIds = photos.map(p => p.id);
  const title = [car.brand, car.model, car.finishing].filter(Boolean).join(" ") || car.name;

  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  } : null;

  return (
    <div className={styles.page}>

      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* ── Breadcrumb / search context ──
           SearchContextBar owns both states: it shows the search bar when URL
           dates are valid and future, and falls back to the fleet breadcrumb
           otherwise. No branching needed here. */}
      <SearchContextBar
        urlStart={searchParams.start ?? ""}
        urlEnd={searchParams.end ?? ""}
        locale={locale}
        backLabel={t.search.backToSearch}
        searchHref={`/${locale}/search?start=${encodeURIComponent(searchParams.start ?? "")}&end=${encodeURIComponent(searchParams.end ?? "")}`}
        fleetHref={`/${locale}/fleet`}
        fleetLabel={t.fleet.title}
      />

      {/* ── Photo slider ── */}
      <div className={styles.sliderSection}>
        <CarSlider
          carId={car.id}
          photoIds={photoIds}
          carName={car.name}
          viewPhotoLabel={t.fleet.viewPhoto}
          photosLabel={t.fleet.photos}
          ariaLabels={t.carSlider}
        />
        {car.isAvailable ? (
          <div className={styles.sliderBadge}>
            <span className={styles.badgeAvail}>{t.fleet.availableToday}</span>
          </div>
        ) : availableFromLabel ? (
          <div className={styles.sliderBadge}>
            <span className={styles.badgeFrom}>{availableFromLabel}</span>
          </div>
        ) : null}
      </div>

      {/* ── Content: title + specs ── */}
      <div className={styles.content} id="booking-options">
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.carName}>{title}</h1>
            {title !== car.name && <p className={styles.carSub}>{car.name}</p>}
          </div>
          <ShareVehicle title={title} labels={t.share} />
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

        {/* ── Location / delivery info ── */}
        {(car.parkingAddress || car.deliveryEnabled) && (
          <div className={styles.specsSection}>
            <h2 className={styles.specsTitle}>
              {car.deliveryEnabled
                ? t.carDetail.delivery.sectionTitle
                : t.carDetail.delivery.notAvailable}
            </h2>

            <div className={styles.locationCards}>

              {/* Base pickup location */}
              {car.parkingAddress && (
                <div className={styles.locationCard}>
                  <div className={styles.locationCardHeader}>
                    <span className={styles.locationCardIconWrap}><MapPin size={16} strokeWidth={1.75} /></span>
                    <div className={styles.locationCardMeta}>
                      <span className={styles.locationCardLabel}>
                        {t.carDetail.delivery.pickupLocation}
                      </span>
                      {!car.deliveryEnabled && (
                        <span className={styles.locationBadgeOrange}>
                          {t.carDetail.delivery.pickupOnly}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={styles.locationCardAddress}>{car.parkingAddress}</p>
                </div>
              )}

              {/* Delivery — radius zone */}
              {car.deliveryEnabled && car.deliveryType === "radius" && car.deliveryRadiusKm != null && (
                <div className={`${styles.locationCard} ${styles.locationCardDelivery}`}>
                  <div className={styles.locationCardHeader}>
                    <span className={styles.locationCardIconWrap}><Truck size={16} strokeWidth={1.75} /></span>
                    <div className={styles.locationCardMeta}>
                      <span className={styles.locationCardLabel}>
                        {t.carDetail.delivery.title}
                      </span>
                      <span className={car.deliveryRadiusPrice == null
                        ? styles.locationBadgeGreen
                        : styles.locationBadgeBlue}>
                        {car.deliveryRadiusPrice != null
                          ? `${car.deliveryRadiusPrice.toFixed(2)} €${t.carDetail.delivery.priceSuffix}`
                          : t.carDetail.delivery.free}
                      </span>
                    </div>
                  </div>
                  <p className={styles.locationCardDesc}>
                    {t.carDetail.delivery.radius}{" "}
                    <strong>{car.deliveryRadiusKm} {t.carDetail.delivery.km}</strong>
                  </p>
                </div>
              )}

              {/* Delivery — fixed locations */}
              {car.deliveryEnabled && car.deliveryType === "location" && car.deliveryLocations?.length ? (
                <div className={`${styles.locationCard} ${styles.locationCardDelivery}`}>
                  <div className={styles.locationCardHeader}>
                    <span className={styles.locationCardIconWrap}><Truck size={16} strokeWidth={1.75} /></span>
                    <div className={styles.locationCardMeta}>
                      <span className={styles.locationCardLabel}>
                        {t.carDetail.delivery.locationTitle}
                      </span>
                      <span className={styles.locationCardCount}>
                        {car.deliveryLocations.length}
                      </span>
                    </div>
                  </div>
                  <div className={styles.deliveryLocGrid}>
                    {car.deliveryLocations.map(loc => (
                      <div key={loc.id} className={styles.deliveryLocCard}>
                        <div className={styles.deliveryLocCardTop}>
                          <span className={styles.deliveryLocCardName}>{loc.label}</span>
                          <span className={`${styles.deliveryLocCardPrice} ${loc.price == null ? styles.deliveryLocCardPriceFree : ""}`}>
                            {loc.price != null
                              ? `${loc.price.toFixed(2)} €`
                              : t.carDetail.delivery.free}
                          </span>
                        </div>
                        <p className={styles.deliveryLocCardMeta}>
                          {t.carDetail.delivery.locationRadius} {loc.radiusKm} km
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

            </div>
          </div>
        )}

        {/* ── Booking Options ── */}
        <BookingOptions
          turoLink={car.turoLink ?? null}
          getaroundLink={car.getaroundLink ?? null}
          urlStart={searchParams.start ?? ""}
          urlEnd={searchParams.end ?? ""}
          businessTz={businessTz}
          labels={t.bookingOptions}
        />
      </div>

      {/* ── Booking section – full-bleed highlighted row ── */}
      <section id="booking" className={styles.bookingSection} aria-label={t.booking.title}>
        <div className={styles.bookingInner}>
          <div className={styles.bookingSectionHead}>
            <p className={styles.bookingSectionEyebrow}>{t.booking.title}</p>
            <h2 className={styles.bookingSectionTitle}>{title}</h2>
          </div>
          <BookingPanel
            carId={car.id}
            locale={locale}
            labels={t.booking}
            deliveryEnabled={car.deliveryEnabled ?? false}
            deliveryType={car.deliveryType ?? null}
            deliveryLocations={car.deliveryLocations ?? []}
            urlStart={searchParams.start ?? ""}
            urlEnd={searchParams.end ?? ""}
            businessTz={businessTz}
          />

          {faqs.length > 0 && (
            <VehicleFaqAccordion
              faqs={faqs}
              title={t.vehicleFaq.title}
              toggleLabel={t.vehicleFaq.toggleLabel}
              dark
            />
          )}

          <AvailabilityCalendar
            carId={car.id}
            labels={t.availabilityCalendar}
            dark
          />
        </div>
      </section>
    </div>
  );
}
