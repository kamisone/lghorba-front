import styles from "./Maintenance.module.css";

export default function Maintenance() {
  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.logo}>
          <img
            className={styles.logoIcon}
            src="/assets/logo_vitecamion_icon.png"
            alt="vitecamion"
          />
          <img
            className={styles.logoText}
            src="/assets/logo_vitecamion_text.png"
            alt=""
            aria-hidden="true"
          />
        </div>

        <div className={styles.divider} />

        <div className={styles.iconWrap} aria-hidden="true">🔧</div>

        <div>
          <h1 className={styles.title}>
            We&apos;ll be{" "}
            <span className={styles.accent}>back soon</span>
          </h1>
        </div>

        <p className={styles.sub}>
          We&apos;re performing scheduled maintenance to improve your experience.
          Thank you for your patience.
        </p>

        <div className={styles.dots} role="status" aria-label="Loading">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>
    </div>
  );
}
