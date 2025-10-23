import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import HackPatchForm from "@/components/Hack/HackPatchForm";
import Link from "next/link";
import { FaChevronLeft } from "react-icons/fa6";

interface EditPatchPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPatchPage({ params }: EditPatchPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=%2Fhack%2F${encodeURIComponent(slug)}%2Fedit%2Fpatch`);
  }

  const { data: hack } = await supabase
    .from("hacks")
    .select("slug,base_rom,created_by,title,current_patch")
    .eq("slug", slug)
    .maybeSingle();
  if (!hack) return notFound();
  if (hack.created_by !== user!.id) return notFound();

  const { data: patchRows } = await supabase
    .from("patches")
    .select("id,version")
    .eq("parent_hack", slug)
    .order("created_at", { ascending: true });
  const existingVersions = (patchRows || []).map((p: any) => p.version as string);

  const currentPatch = patchRows?.find((p: any) => p.id === hack.current_patch);
  const currentVersion = currentPatch?.version;

  return (
    <div className="mx-auto max-w-screen-lg px-6 py-10">
      <h1 className="flex flex-col text-4xl tracking-tight max-w-[480px]">
        <span className="text-foreground/70 mr-2 text-xl">Upload new version for</span>
        <span className="gradient-text font-bold">{hack.title}</span>
      </h1>

      <div className="mt-8 card p-5 max-w-[480px]">
        <HackPatchForm
          slug={slug}
          baseRomId={hack.base_rom}
          existingVersions={existingVersions}
          currentVersion={currentVersion}
        />
      </div>

      <div className="mt-8 flex items-center justify-center">
        <Link href={`/hack/${slug}`} className="items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
          <FaChevronLeft size={16} className="inline-block mr-1" />
          Back to hack
        </Link>
      </div>
    </div>
  );
}


