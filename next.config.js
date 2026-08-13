/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits a pruned .next/standalone (traced deps only, no source, no dev deps)
  // instead of shipping the full repo + node_modules in the Docker image —
  // see docker/Dockerfile for the matching multi-stage build.
  output: "standalone",
  experimental: {
    // lucide-react ships hundreds of icon modules; this teaches Next's module
    // resolution to reach each icon file directly instead of pulling anything
    // through the package's barrel export.
    optimizePackageImports: ["lucide-react"],
  },
  env: {
    API_BASE_URL_BROWSER:  process.env.API_BASE_URL_BROWSER  ?? "http://localhost:4000",
    NEXT_PUBLIC_GCS_BUCKET: process.env.GCS_BUCKET_NAME ?? "",
  },
  images: {
    // On-demand optimization is DISABLED: next/image now emits the GCS URL
    // directly and `/_next/image` is never hit.
    //
    // Next optimizes inside the user's request (next-server.js awaits the
    // optimizer before sending any bytes), so every uncached variant made a real
    // visitor wait for a sharp encode on a pod capped at 500m CPU. Measured on a
    // production 1200x1200 media JPEG: ~9.9 s cold vs 0.08 s warm, and because
    // the cache is per-pod and ephemeral the cold cost recurred on every replica
    // and every deploy. Encoding also fed the CPU-target HPA, scaling the
    // deployment out on image traffic.
    //
    // Trade-off, accepted deliberately: originals are served unresized, so a
    // 1200x1200 / 222 KB source is sent where a 640px WebP would have been ~42 KB.
    // Serving straight from GCS (1 year immutable, see MEDIA_CACHE_CONTROL in
    // back/src/media/media.service.ts) keeps it off the pods entirely.
    // The durable fix is resized derivatives generated at upload time.
    unoptimized: true,
    // Retained so the optimizer stays correctly configured if it is re-enabled.
    formats: ["image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
    minimumCacheTTL: 31536000, // 1 year
  },
  async redirects() {
    return [
      // /cart and /checkout moved under /shop to keep ecommerce routes in one namespace.
      { source: "/:locale(fr|en|es|it|de|nl|pl)/cart",              destination: "/:locale/shop/cart",              permanent: true },
      { source: "/:locale(fr|en|es|it|de|nl|pl)/checkout",          destination: "/:locale/shop/checkout",          permanent: true },
      { source: "/:locale(fr|en|es|it|de|nl|pl)/checkout/success",  destination: "/:locale/shop/checkout/success",  permanent: true },
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
