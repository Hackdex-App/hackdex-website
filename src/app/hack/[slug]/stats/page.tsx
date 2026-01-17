import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import HackStatsClient from "@/components/Hack/Stats/HackStatsClient";
import { getDownloadsSeriesAll, getHackInsights } from "@/app/dashboard/actions";
import { checkEditPermission } from "@/utils/hack";

interface HackStatsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function HackStatsPage({ params }: HackStatsPageProps) {
  const { slug } = await params;
  const supa = await createClient();
  const { data: userResp } = await supa.auth.getUser();
  const user = userResp.user;
  if (!user) redirect("/login");

  const { data: hack } = await supa
    .from("hacks")
    .select("slug,created_by,title,original_author,current_patch,permission_from,is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (!hack) notFound();

  const permission = await checkEditPermission(hack, user.id, supa);
  if (!permission.canEdit) {
    redirect(`/hack/${slug}`);
  }

  const allSeries = await getDownloadsSeriesAll({ days: 30, userId: hack.created_by });
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


