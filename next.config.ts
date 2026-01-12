import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

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

  // Add headers for service worker
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
    ];
  },
};

export default nextConfig;
