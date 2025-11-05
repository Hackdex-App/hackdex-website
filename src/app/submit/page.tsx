import HackForm from "@/components/Hack/HackForm";
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
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();
    needsInitialSetup = !profile || profile.username == null;
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-10 w-full">
      <h1 className="text-3xl font-bold tracking-tight">Submit your ROM hack</h1>
      <p className="mt-2 text-[15px] text-foreground/80">Share your hack so others can discover and play it.</p>
      <div className="mt-8">
        <HackForm mode="create" dummy={!user || needsInitialSetup} />
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



