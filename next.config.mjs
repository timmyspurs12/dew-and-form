/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["*.e2b.app"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.makeupar.com",
      },
      {
        protocol: "https",
        hostname: "**.perfectcorp.com",
      },
      {
        protocol: "https",
        hostname: "**.openbeautyfacts.org",
      },
    ],
  },
};

export default nextConfig;
