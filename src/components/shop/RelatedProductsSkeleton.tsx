import styles from "./RelatedProductsCarousel.module.css";

export default function RelatedProductsSkeleton() {
  return (
    <section className={styles.section} aria-hidden="true">
      <div className={styles.header}>
        <div className={`${styles.skeletonBar} ${styles.skeletonTitle}`} />
      </div>

      <div className={styles.viewport}>
        <div className={styles.track}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.slide}>
              <div className={styles.skeletonCard}>
                <div className={styles.skeletonImage} />
                <div className={styles.skeletonInfo}>
                  <div className={`${styles.skeletonBar} ${styles.skeletonLine}`} />
                  <div className={`${styles.skeletonBar} ${styles.skeletonLineShort}`} />
                  <div className={`${styles.skeletonBar} ${styles.skeletonPrice}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
