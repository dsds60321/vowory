import type { MetadataRoute } from "next";
import { getSiteOrigin, joinSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/editor", "/login", "/mypage", "/rsvp-admin", "/invitation", "/thankyou", "/api"],
      },
    ],
    sitemap: joinSiteUrl("/sitemap.xml"),
    host: siteOrigin,
  };
}
