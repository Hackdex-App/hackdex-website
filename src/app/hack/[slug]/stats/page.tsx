import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import HackStatsClient from "@/components/Hack/Stats/HackStatsClient";
import { getDownloadsSeriesAll, getHackInsights } from "@/app/dashboard/actions";

export default async function HackStatsPage({ params: { slug } }: { params: { slug: string } }) {
  const supa = await createClient();
  const { data: userResp } = await supa.auth.getUser();
  const user = userResp.user;
  if (!user) redirect("/login");

  const { data: hack } = await supa
    .from("hacks")
    .select("slug,created_by,title")
    .eq("slug", slug)
    .maybeSingle();
  if (!hack) notFound();

  let isOwner = hack.created_by === user.id;
  if (!isOwner) {
    const { data: admin } = await supa.rpc("is_admin");
    if (!admin) notFound();
  }

  const allSeries = await getDownloadsSeriesAll({ days: 30 });
  const series = {
    labels: allSeries.labels,
    datasets: allSeries.datasets.filter((d) => d.slug === slug),
    lastComputedUtc: allSeries.lastComputedUtc,
  };

  const insights = await getHackInsights({ slug });

  return (
    <div className="mx-auto my-auto max-w-screen-2xl px-6 py-8">
      <HackStatsClient slug={slug} title={hack.title} initialSeries={series} initialInsights={insights} />
    </div>
  );
}


