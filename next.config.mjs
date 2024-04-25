/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  headers: [
    {
      key: "Access-Control-Allow-Origin",
      value: process.env.PREPROD_PUBLIC_APP_URL,
    },
  ],
};

export default nextConfig;
