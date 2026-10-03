import StartDraftForm from "@/components/Submit/StartDraftForm";
import { createClient } from "@/utils/supabase/server";
import SubmitAuthOverlay from "@/components/Submit/SubmitAuthOverlay";
import { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/submit",
  },
};

export default async function SubmitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let needsInitialSetup = false;
  let canSubmitForOthers = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();
    needsInitialSetup = !profile || profile.username == null;

    // Archivers (admins included) can list someone else's hack.
    const { data: isArchiver } = await supabase.rpc("is_archiver");
    canSubmitForOthers = !!isArchiver;
  }
  const dummy = !user || needsInitialSetup;

  return (
    <div className="mx-auto w-full max-w-[1164px] px-6 pb-6 pt-8 md:pt-10">
      <div className="flex flex-col items-center gap-5">
        <StartDraftForm disabled={dummy} canSubmitForOthers={canSubmitForOthers} />
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
