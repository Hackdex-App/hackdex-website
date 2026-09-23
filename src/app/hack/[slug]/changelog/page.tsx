import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Markdown from "@/components/Markdown/Markdown";
import Link from "next/link";
import { FaChevronLeft } from "react-icons/fa6";

interface ChangelogPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChangelogPage({ params }: ChangelogPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch hack
  const { data: hack } = await supabase
    .from("hacks")
    .select("slug, title, current_patch")
    .eq("slug", slug)
    .maybeSingle();

  if (!hack) return notFound();

  // Fetch all published, non-archived patches with changelogs
  const { data: patches } = await supabase
    .from("patches")
    .select("id, version, created_at, changelog")
    .eq("parent_hack", slug)
    .eq("published", true)
    .eq("archived", false)
    .not("changelog", "is", null)
    .order("created_at", { ascending: false });

  const patchesWithChangelogs = (patches || []).filter(p => p.changelog && p.changelog.trim().length > 0);

  return (
    <div className="mx-auto w-full max-w-screen-md px-6 py-10">
      <div className="mb-6">
        <Link 
          href={`/hack/${slug}`}
          className="inline-flex items-center text-sm text-text-3 hover:text-text mb-2"
        >
          <FaChevronLeft size={14} className="mr-1" />
          Back to hack
        </Link>
        <h1 className="font-display text-[28px] leading-[1.1] md:text-[32px]">Changelog</h1>
        <p className="mt-1 text-sm text-text-3">
          {hack.title}
        </p>
      </div>

      {patchesWithChangelogs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-text-3">No changelogs available yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {patchesWithChangelogs.map((patch) => (
            <div key={patch.id} className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {patch.version}
                    {hack.current_patch === patch.id && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-ready-soft px-2 py-0.5 text-xs font-medium text-ready">
                        Current
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-text-3">
                    {new Date(patch.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-text-2">
                <Markdown headingLevelOffset={1}>{patch.changelog || ""}</Markdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

