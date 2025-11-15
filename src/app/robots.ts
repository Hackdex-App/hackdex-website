import type { MetadataRoute } from "next";

export default function Robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/_next/",
        "/api/",
        "/account/",
        "/auth/",
        "/roms/",
      ],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL!}/sitemap.xml`,
  };
}
