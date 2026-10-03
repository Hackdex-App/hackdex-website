import Link from "next/link";
import SignupForm from "@/components/Auth/SignupForm";

interface SignupPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { redirectTo } = await searchParams;

  return (
    <div className="mx-auto my-auto max-w-md w-full px-3 py-10 md:px-6">
      <div className="card px-4 py-6 md:p-8">
        <h1 className="font-display text-[28px] leading-[1.1]">Become a creator</h1>
        <p className="mt-1 text-sm text-text-2">An account lets you share your hacks on Hackdex.</p>
        <p className="mt-4 rounded-control bg-surface-2 px-3 py-2.5 text-sm text-text-2">
          Here to play? You don&rsquo;t need an account.{" "}
          <Link href="/discover" className="text-link-hd">
            Browse hacks
          </Link>
        </p>
        <p className="mt-3 text-sm rounded-control bg-warn-soft p-3 text-text">
            Only share hacks <span className="font-semibold">you made</span>. If you&rsquo;d like to see someone else&rsquo;s hack here, ask its creator to share it on Hackdex.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
        <p className="mt-6 text-sm text-text-2">
          Already a creator?
          <Link className="ml-1 text-link-hd" href="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
