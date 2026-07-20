import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker containerization
  output: "standalone",

  // Keep pdfkit out of webpack bundle — it needs fs access to load .afm font files
  serverExternalPackages: ["pdfkit"],

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
        // Long-lived caching for static landing assets (images, video, fonts, svgs).
        // These have stable filenames and rarely change; bump the filename if one is replaced.
        source: "/landing/assests/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000" },
        ],
      },
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
            // camera/microphone allowed for self (needed by /apply's video introduction
            // recorder); still blocked for any third-party/cross-origin embed.
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
          {
            // Content-Security-Policy — allows the app's known services
            // (Razorpay payments, Firebase/FCM, Google Fonts) while blocking
            // untrusted script/object sources. TEST the dashboard (payments,
            // push notifications) before deploy; adjust the allowlist if needed.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://www.gstatic.com https://*.googleapis.com https://www.youtube.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.razorpay.com https://*.googleapis.com https://*.firebaseio.com https://fcm.googleapis.com wss://*.firebaseio.com",
              "frame-src 'self' https://*.razorpay.com https://www.youtube.com",
              "media-src 'self' blob:",
              "worker-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
