import UpdatePasswordForm from "@/components/Account/UpdatePasswordForm";
import Button from "@/components/Button";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { FaChevronLeft } from "react-icons/fa";

interface UpdatePasswordPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { from } = await searchParams;

  if (!user) {
    redirect('/login?redirectTo=%2Faccount%2Fupdate-password');
  }

  return (
    <div className="mx-auto my-auto max-w-md w-full px-6 py-10">
      {from === 'account' && (
        <div className="mb-4">
          <Link href="/account">
            <Button variant="secondary" size="sm">
              <FaChevronLeft size={12} className="inline-block -ml-1 mr-1" />
              Back to account
            </Button>
          </Link>
        </div>
      )}
      <div className="card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Change your password</h1>
        <p className="mt-1 text-sm text-foreground/70">Enter a new password for your account.</p>
        <div className="mt-6">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}



