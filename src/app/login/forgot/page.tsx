import ForgotPasswordForm from "@/components/Auth/ForgotPasswordForm";
import Link from "next/link";

interface ForgotPasswordPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { redirectTo } = await searchParams;

  return (
    <div className="mx-auto my-auto max-w-md w-full px-3 py-10 md:px-6">
      <div className="card px-4 py-6 md:p-8">
        <h1 className="font-display text-[28px] leading-[1.1]">Forgot password</h1>
        <p className="mt-1 text-sm text-text-2">Enter your email and we'll send you a reset link.</p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-sm text-text-2">
          Remember now?
          <Link
            className="ml-1 text-link-hd"
            href={redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login"}
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}


