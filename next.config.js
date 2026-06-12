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
  async redirects() {
    return [
      // /cart and /checkout moved under /shop to keep ecommerce routes in one namespace.
      { source: "/:locale(fr|en)/cart",              destination: "/:locale/shop/cart",              permanent: true },
      { source: "/:locale(fr|en)/checkout",          destination: "/:locale/shop/checkout",          permanent: true },
      { source: "/:locale(fr|en)/checkout/success",  destination: "/:locale/shop/checkout/success",  permanent: true },
    ];
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
