import type { ReactNode } from "react";
import styles from "./KPICard.module.css";

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
  sub: string;
}

export default function KPICard({ icon, label, value, accent, sub }: Props) {
  return (
    <div className={styles.kpiCard} style={{ borderTopColor: accent }}>
      <div className={styles.kpiHeader}>
        <span className={styles.kpiIcon} style={{ color: accent }}>
          {icon}
        </span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiSub}>{sub}</div>
    </div>
  );
}
