import type { MetadataRoute } from "next";
import { getSiteOrigin, joinSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteOrigin = getSiteOrigin();
  const now = new Date();

  return [
    {
      url: siteOrigin,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: joinSiteUrl("/notices"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
