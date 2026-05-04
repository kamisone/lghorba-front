"use client";

import { getTranslations } from "@/lib/i18n";
import { useFleetPriceContext } from "./FleetPriceContext";
import styles from "./fleet.module.css";

export default function CarPriceSlot({ carId, locale }: { carId: string; locale: string }) {
  const { prices, loadingPrices, hasCtx } = useFleetPriceContext();
  if (!hasCtx) return null;

  const t = getTranslations(locale);
  const priceInfo = prices.get(carId);

  return (
    <div className={styles.priceTag}>
      {priceInfo ? (
        <>
          <span className={styles.priceTagAmount}>€{priceInfo.total.toFixed(2)}</span>
          <span className={styles.priceTagSub}>
            {t.search.totalLabel} · {priceInfo.days} {t.search.days}
          </span>
        </>
      ) : loadingPrices ? (
        <span className={styles.priceTagSkeleton} />
      ) : null}
    </div>
  );
}
