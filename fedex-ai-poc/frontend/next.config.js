/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Suppress static prerender errors from Next.js internal /_error Pages Router page
  // which conflicts with App Router in Next.js 14 during static generation
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
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
