import { createClient } from "@/utils/supabase/server";
import { MetadataRoute } from "next";

export default async function Sitemap(): Promise<MetadataRoute.Sitemap> {
  let routes: MetadataRoute.Sitemap = [
    { url: "/", lastModified: new Date().toISOString() },
    { url: "/discover", lastModified: new Date().toISOString(), changeFrequency: "daily" as const },
    { url: "/terms", lastModified: new Date().toISOString(), changeFrequency: "monthly" as const },
  ];

  const supabase = await createClient();

  const { data: hacks } = await supabase.from("hacks").select("slug,updated_at,approved");
  if (hacks) {
    const approvedHacks = hacks.filter((hack) => hack.approved);
    routes.push(...approvedHacks.map((hack) => ({
      url: `/hack/${hack.slug}`,
      changeFrequency: "weekly" as const,
      lastModified: hack.updated_at || new Date().toISOString(),
    })));
  }

  return routes.map((route) => ({
    ...route,
    url: `${process.env.NEXT_PUBLIC_SITE_URL!}${route.url}`,
  }));
}
