import styles from "./car-public.module.css";

export default function CarDetailLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb} />
      <div className={styles.sliderSection}>
        <div className={styles.sliderSkeleton} />
      </div>
      <div className={styles.content}>
        <div className={styles.contentSkeleton} />
      </div>
    </div>
  );
}
