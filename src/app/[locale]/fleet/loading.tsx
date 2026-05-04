import styles from "./fleet.module.css";

export default function FleetLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroBgGlow} />
          <div className={styles.heroBgGrid} />
        </div>
        <div className={styles.heroContent} />
      </div>
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.cardSkeleton} />
        ))}
      </div>
    </div>
  );
}
