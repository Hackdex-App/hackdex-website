import SubmitPageClient from "@/components/Submit/SubmitPageClient";
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

export default async function SubmitPage() {
  const catalogTags = await getCachedTagsWithUsage();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let needsInitialSetup = false;
  let canCreateArchive = false;
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
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-10 w-full">
      <h1 className="text-3xl font-bold tracking-tight">Submit your ROM hack</h1>
      <p className="mt-2 text-[15px] text-foreground/80">Share your hack so others can discover and play it.</p>
      <div className="mt-2 text-sm border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-100 p-4 rounded-md">
        <p className="font-bold mb-2">Important:</p>
        <div className="flex flex-col gap-1">
          <p className="text-amber-950/80 dark:text-amber-50/80">
            Hackdex will only accept submissions for hacks that <span className="text-amber-950 dark:text-amber-50 font-bold">you own</span>.
            If it is not your hack, try reaching out to the original creator to see if they are interested in submitting it themselves.
            All hacks must also comply with the <Link href="/terms" className="text-amber-950 dark:text-amber-50 font-bold hover:underline">Terms of Service</Link>.
          </p>
          <p className="text-amber-950/80 dark:text-amber-50/80">
            If you attempt to circumvent this policy, <span className="text-amber-950 dark:text-amber-50 font-bold italic">your submission will be rejected</span> and your account may be banned.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <SubmitPageClient canCreateArchive={canCreateArchive} dummy={!user || needsInitialSetup} catalogTags={catalogTags} />
      </div>
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



