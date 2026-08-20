import MetaPixelSettings from "@/components/admin/marketing/MetaPixelSettings";
import TikTokPixelSettings from "@/components/admin/marketing/TikTokPixelSettings";

export default function MetaPixelPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <MetaPixelSettings />
      <TikTokPixelSettings />
    </div>
  );
}
