import styles from "@/components/admin/shop/ShopAdmin.module.css";

export default function CampaignsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Campaigns</h1>
        <span className={`${styles.badge} ${styles.badgeDraft}`}>Coming soon</span>
      </div>
      <div style={{ padding: "64px 0", textAlign: "center", color: "#9ca3af" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📣</div>
        <p style={{ fontSize: 16, fontWeight: 500, color: "#374151", marginBottom: 8 }}>Campaign management is in development</p>
        <p style={{ fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
          Group promotions into campaigns and track their performance over time.
          Use Promotion Categories in the meantime to segment your promotions.
        </p>
      </div>
    </div>
  );
}
