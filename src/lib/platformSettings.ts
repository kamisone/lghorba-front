const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

// Platform settings (business timezone, Meta Pixel config, ...) change only
// when an admin edits them from the settings page — a short revalidate window
// avoids forcing every public page that reads this into fully dynamic SSR
// (which `cache: "no-store"` would do, defeating the ISR `revalidate` export
// on every route that ends up depending on this fetch).
const REVALIDATE_SECONDS = 300;

interface MetaPixelConfig { pixelId: string | null; enabled: boolean }

interface PlatformSettings {
  timezone?: string;
  metaPixel?: MetaPixelConfig;
}

async function getPlatformSettings(): Promise<PlatformSettings | null> {
  try {
    const res = await fetch(`${API}/public/platform-settings`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as PlatformSettings;
  } catch {
    return null;
  }
}

export async function getBusinessTimezone(): Promise<string> {
  const settings = await getPlatformSettings();
  return settings?.timezone ?? "Europe/Paris";
}

export async function getMetaPixelConfig(): Promise<MetaPixelConfig> {
  const settings = await getPlatformSettings();
  return settings?.metaPixel ?? { pixelId: null, enabled: false };
}
