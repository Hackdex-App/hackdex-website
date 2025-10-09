import AccountForm from "@/components/Account/AccountForm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-screen-lg px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Your account</h1>
      <p className="mt-2 text-[15px] text-foreground/80">Manage profile details and avatar.</p>
      <div className="mt-8 card p-6">
        <AccountForm user={user} />
      </div>
    </div>
  );
}
