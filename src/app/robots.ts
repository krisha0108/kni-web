import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/landing/", "/guide/"],
        disallow: [
          "/api/",
          "/admin/",
          "/owner/",
          "/vendor/",
          "/engineer/",
          "/settings/",
          "/notifications/",
          "/login",
          "/register-owner",
          "/register-vendor",
          "/forgot-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
