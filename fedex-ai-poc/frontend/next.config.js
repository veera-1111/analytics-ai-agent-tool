/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/ai",
  output: "standalone",
  // NEXT_PUBLIC_API_BASE_URL is injected by Amplify env vars at build time
  // For local Docker dev, rewrites proxy to backend container
  ...(process.env.NODE_ENV === "development" && {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: "http://backend:8000/api/:path*",
        },
      ];
    },
  }),
};

module.exports = nextConfig;
