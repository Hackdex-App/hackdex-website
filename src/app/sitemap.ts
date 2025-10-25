import { createClient } from "@/utils/supabase/server";
import { MetadataRoute } from "next";

export default async function Sitemap(): Promise<MetadataRoute.Sitemap> {
  let routes: MetadataRoute.Sitemap = [
    { url: "/", lastModified: new Date().toISOString() },
    { url: "/discover", lastModified: new Date().toISOString(), changeFrequency: "daily" as const },
  ];

  const supabase = await createClient();

  const { data: hacks } = await supabase.from("hacks").select("slug,updated_at");
  if (hacks) {
    routes.push(...hacks.map((hack) => ({
      url: `/hack/${hack.slug}`,
      changeFrequency: "weekly" as const,
      lastModified: hack.updated_at || new Date().toISOString(),
    })));
  }

  return routes.map((route) => ({
    ...route,
    url: `${process.env.NEXT_PUBLIC_SITE_URL!}/${route.url}`,
  }));
}
