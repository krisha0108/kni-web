import type { MetadataRoute } from "next";
import { POSTS } from "./blog/posts";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const blogPosts: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/launchpad`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/guide/owner`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...blogPosts,
    { url: `${BASE_URL}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/refund-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/cancellation-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
