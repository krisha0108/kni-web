import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker containerization
  output: "standalone",

  // Disable Next.js image optimizer so uploaded images served directly via /uploads/ work correctly
  images: {
    unoptimized: true,
  },

  // Turbopack config (empty to silence warning, service worker works by default)
  turbopack: {},

  // Enable service worker support for Firebase Cloud Messaging (for webpack mode)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure service worker files are properly handled
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Add headers for service worker and security
  async headers() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
