import LoginForm from "@/components/Auth/LoginForm";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo } = await searchParams;

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (user) {
    return redirect(redirectTo ? `/${redirectTo}` : "/account");
  }

  return (
    <div className="mx-auto my-auto max-w-md w-full px-6 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-foreground/70">Log in to manage your account and submissions.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-sm text-foreground/70">
          New here?
          <Link className="ml-1 text-[var(--accent)] hover:underline" href={redirectTo ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"}>Create an account</Link>
        </p>
      </div>
    </div>
  )
}
