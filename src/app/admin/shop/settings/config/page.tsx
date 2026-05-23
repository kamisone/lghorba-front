import styles from "@/components/admin/shop/ShopAdmin.module.css";

export default function CommerceConfigPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Commerce Configuration</h1>
        <span className={`${styles.badge} ${styles.badgeDraft}`}>Coming soon</span>
      </div>
      <div style={{ padding: "64px 0", textAlign: "center", color: "#9ca3af" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
        <p style={{ fontSize: 16, fontWeight: 500, color: "#374151", marginBottom: 8 }}>Commerce configuration is in development</p>
        <p style={{ fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
          Global settings for your store — inventory policy, guest checkout, order numbering, and more.
        </p>
      </div>
    </div>
  );
}
