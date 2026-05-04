/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Restrict CORS header to API proxy routes only, not to static assets
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
