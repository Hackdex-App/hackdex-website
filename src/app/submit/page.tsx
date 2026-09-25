import SubmitPageClient from "@/components/Submit/SubmitPageClient";
import StartDraftForm from "@/components/Submit/StartDraftForm";
import { getCachedTagsWithUsage } from "@/data/tags";
import { createClient } from "@/utils/supabase/server";
import SubmitAuthOverlay from "@/components/Submit/SubmitAuthOverlay";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: {
    canonical: "/submit",
  },
};

interface SubmitPageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function SubmitPage({ searchParams }: SubmitPageProps) {
  const { mode } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let needsInitialSetup = false;
  let canCreateArchive = false;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();
    needsInitialSetup = !profile || profile.username == null;

    // Check if user is archiver (or admin)
    const { data: isArchiver } = await supabase.rpc("is_archiver");
    canCreateArchive = !!isArchiver;
    const { data: admin } = await supabase.rpc("is_admin");
    isAdmin = !!admin;
  }
  const dummy = !user || needsInitialSetup;
  // Archives still go through the one-shot wizard; everyone else starts a draft.
  const wizard = mode === "wizard" && canCreateArchive;

  return (
    <div className="mx-auto w-full max-w-[1164px] px-6 pb-6 pt-8 md:pt-10">
      {wizard ? (
        <div className="mx-auto max-w-[900px]">
          <h1 className="font-display text-[28px]">Submit an archive entry</h1>
          <div className="mt-8">
            <SubmitPageClient canCreateArchive={canCreateArchive} dummy={dummy} catalogTags={await getCachedTagsWithUsage()} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <StartDraftForm disabled={dummy} canSubmitForOthers={isAdmin} />
          {canCreateArchive && (
            <p className="text-[13px] text-text-3">
              Submitting an archive entry?{" "}
              <Link href="/submit?mode=wizard" className="text-link-hd">Use the archive form</Link>
            </p>
          )}
        </div>
      )}
      {!user ? (
        <SubmitAuthOverlay
          title='Creators only'
          message='You need an account before you can submit your romhacks for others to play. It only takes a minute.'
          primaryHref='/signup'
          primaryLabel='Create account'
          secondaryHref='/login?redirectTo=%2Fsubmit'
          secondaryLabel='Log in'
        />
      ) : (
        needsInitialSetup ? (
          <SubmitAuthOverlay
            title="Finish setting up your account"
            message="You need to choose a username before you can submit your first romhack."
            primaryHref="/account"
            primaryLabel="Finish setup"
            ariaLabel="Account setup required"
          />
        ) : null
      )}
    </div>
  );
}
