import AccountForm from "@/components/Account/AccountForm";
import AccountOptionsMenu from "@/components/Account/AccountOptionsMenu";
import AccountSetupForm from "../../components/Account/AccountSetupForm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

interface AccountPageProps {
  searchParams: Promise<{ passwordUpdated?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { passwordUpdated } = await searchParams;

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
      <div className="flex flex-row justify-between items-end">
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{needsInitialSetup ? 'Finish setting up your account' : 'Your account'}</h1>
          </div>
          <p className="mt-2 text-[15px] text-foreground/80 max-w-md">
            {needsInitialSetup ? 'Choose a unique username to get started. You can update other details later.' : 'Manage profile details and avatar.'}
          </p>
        </div>
        {!needsInitialSetup && <AccountOptionsMenu />}
      </div>
      {passwordUpdated && (
        <div className="mt-8 rounded-md bg-green-500/10 ring-1 ring-green-600/40 px-3 py-2 text-sm text-green-300">
          Your password was updated successfully.
        </div>
      )}
      <div className={`${passwordUpdated ? 'mt-4' : 'mt-8'} card p-6 max-w-md`}>
        {needsInitialSetup ? (
          <AccountSetupForm user={user} />
        ) : (
          <AccountForm user={user} profile={profile} />
        )}
      </div>
    </div>
  );
}
