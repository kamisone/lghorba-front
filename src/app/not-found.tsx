import styles from "./error-pages.module.css";

export default function NotFound() {
  return (
    <div className={styles.fullPage}>
      <p className={styles.code}>404</p>
      <div className={styles.accentBar} />
      <h1 className={`${styles.title} ${styles.titleDark}`}>Page not found</h1>
      <p className={`${styles.sub} ${styles.subDark}`}>
        The page you are looking for does not exist or has been moved.
      </p>
      <div className={styles.actions}>
        <a href="/" className={styles.btnPrimary}>Go to home</a>
      </div>
    </div>
  );
}
