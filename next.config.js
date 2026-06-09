/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_BASE_URL_BROWSER:  process.env.API_BASE_URL_BROWSER  ?? "http://localhost:4000",
    NEXT_PUBLIC_GCS_BUCKET: process.env.GCS_BUCKET_NAME ?? "",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
    minimumCacheTTL: 3600,
  },
  async headers() {
    return [
      {
        // Tell all crawlers not to index or follow admin pages.
        // X-Robots-Tag is authoritative even before the HTML <head> is parsed.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // Restrict CORS header to API proxy routes only, not to static assets.
        source: "/next-api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.PREPROD_PUBLIC_APP_URL ?? "",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
