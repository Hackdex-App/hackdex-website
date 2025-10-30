import ForgotPasswordForm from "@/components/Auth/ForgotPasswordForm";
import Link from "next/link";

interface ForgotPasswordPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { redirectTo } = await searchParams;

  return (
    <div className="mx-auto my-auto max-w-md w-full px-6 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
        <p className="mt-1 text-sm text-foreground/70">Enter your email and we'll send you a reset link.</p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-sm text-foreground/70">
          Remember now?
          <Link
            className="ml-1 text-[var(--accent)] hover:underline"
            href={redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login"}
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}


