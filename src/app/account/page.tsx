import AccountForm from "@/components/Account/AccountForm";
import AccountSetupForm from "../../components/Account/AccountSetupForm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile server-side to decide which form to render and pass to client
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, website, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const needsInitialSetup = !profile || profile.username == null

  return (
    <div className="mx-auto my-auto max-w-screen-lg px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{needsInitialSetup ? 'Finish setting up your account' : 'Your account'}</h1>
      <p className="mt-2 text-[15px] text-foreground/80">
        {needsInitialSetup ? 'Choose a unique username to get started. You can update other details later.' : 'Manage profile details and avatar.'}
      </p>
      <div className="mt-8 card p-6 max-w-md">
        {needsInitialSetup ? (
          <AccountSetupForm user={user} />
        ) : (
          <AccountForm user={user} profile={profile} />
        )}
      </div>
    </div>
  );
}
