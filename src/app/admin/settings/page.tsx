import PlatformSettings from "@/components/admin/settings/PlatformSettings";

export const metadata = { title: "Settings — Admin" };

export default function AdminSettingsPage() {
  return (
    <div style={{ padding: "32px 24px", maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 24 }}>
        Settings
      </h1>
      <PlatformSettings />
    </div>
  );
}
