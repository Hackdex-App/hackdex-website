import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignupForm from "@/components/Auth/SignupForm";

interface SignupPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { redirectTo } = await searchParams;

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (user) {
    return redirect(redirectTo ? `/${redirectTo}` : "/account");
  }

  return (
    <div className="mx-auto my-auto max-w-md w-full px-6 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-foreground/70">Sign up to submit hacks and manage your profile.</p>
        <div className="mt-6">
          <SignupForm />
        </div>
        <p className="mt-6 text-sm text-foreground/70">
          Already have an account?
          <Link className="ml-1 text-[var(--accent)] hover:underline" href="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
