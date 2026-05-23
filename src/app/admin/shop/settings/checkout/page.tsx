import styles from "@/components/admin/shop/ShopAdmin.module.css";

export default function CheckoutSettingsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Checkout Settings</h1>
        <span className={`${styles.badge} ${styles.badgeDraft}`}>Coming soon</span>
      </div>
      <div style={{ padding: "64px 0", textAlign: "center", color: "#9ca3af" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
        <p style={{ fontSize: 16, fontWeight: 500, color: "#374151", marginBottom: 8 }}>Checkout settings are in development</p>
        <p style={{ fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
          Configure checkout flow options — required fields, guest checkout, terms acceptance, and address validation.
        </p>
      </div>
    </div>
  );
}
