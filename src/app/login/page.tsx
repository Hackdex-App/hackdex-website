import LoginForm from "@/components/Auth/LoginForm";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo } = await searchParams;

  return (
    <div className="mx-auto my-auto max-w-md w-full px-3 py-10 md:px-6">
      <div className="card px-4 py-6 md:p-8">
        <h1 className="font-display text-[28px] leading-[1.1]">Creator log in</h1>
        <p className="mt-1 text-sm text-text-2">Manage your hacks, upload new versions, and see downloads.</p>
        <p className="mt-4 rounded-control bg-surface-2 px-3 py-2.5 text-sm text-text-2">
          Here to play? You don&rsquo;t need an account.{" "}
          <Link href="/discover" className="text-link-hd">
            Browse hacks
          </Link>
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-sm text-text-2">
          New creator?
          <Link className="ml-1 text-link-hd" href={redirectTo ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"}>Become a creator</Link>
        </p>
      </div>
    </div>
  )
}
