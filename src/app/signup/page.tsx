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
        <h1 className="font-display text-[28px] leading-[1.1]">Create your account</h1>
        <p className="mt-1 text-sm text-text-2">Sign up to submit hacks and manage your profile.</p>
        <p className="mt-4 text-sm rounded-control bg-warn-soft p-3 text-text">
            Share hacks <span className="font-semibold">you made</span>, or ones the creator has given you permission to share. Anything else will be rejected.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
        <p className="mt-6 text-sm text-text-2">
          Already have an account?
          <Link className="ml-1 text-link-hd" href="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
