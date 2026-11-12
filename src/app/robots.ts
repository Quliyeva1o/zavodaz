import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { href } from "@/i18n/routes";
import { siteNoindex, siteUrl } from "@/lib/seo";

// Spec 7.3: cabinet, admin and auth pages are closed to crawlers.
const closed = ["cabinet", "login", "register"] as const;

export default function robots(): MetadataRoute.Robots {
  if (siteNoindex) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", ...locales.flatMap((l) => closed.map((r) => href(r, l)))],
    },
    host: siteUrl,
  };
}
