import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { approveHack } from "@/app/hack/actions";
import Button from "@/components/Button";
import Link from "next/link";
import { FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";

interface ApprovePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ApprovePage({ params }: ApprovePageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return notFound();

  // Fetch hack data
  const { data: hack, error } = await supabase
    .from("hacks")
    .select("title, approved, approved_at, approved_by")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !hack) return notFound();

  // If already approved, fetch approver's username
  let approverUsername: string | null = null;
  if (hack.approved && hack.approved_by) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", hack.approved_by as string)
      .maybeSingle();
    approverUsername = profile?.username || null;
  }

  const utcDate = hack.approved_at ? new Date(hack.approved_at) : null; // Ensure it's parsed as UTC
  const localDateStr = utcDate ? utcDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }) : null;
  const localTimeStr = utcDate ? utcDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }) : null;

  async function handleApprove() {
    "use server";
    await approveHack(slug);
  }

  return (
    <div className="mx-auto max-w-screen-lg w-full pb-28">
      <div className="pt-8 md:pt-10 px-6">
        {hack.approved ? (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaCircleCheck className="text-green-500 flex-shrink-0" size={24} />
              <h1 className="text-2xl">{hack.title}</h1>
            </div>
            <p className="text-foreground/75">
              This hack has already been approved
              {hack.approved_by && approverUsername
                ? <span> by <span className="font-semibold">@{approverUsername}</span></span>
                : hack.approved_by
                  ? " by an admin"
                  : ""}
              {hack.approved_at && <span> on <span className="font-semibold">{localDateStr}</span> at <span className="font-semibold">{localTimeStr}</span></span>}.
            </p>
            <div className="mt-6">
              <Link href={`/hack/${slug}`}>
                <Button variant="secondary">Back to hack</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-4">
              <FaTriangleExclamation className="text-yellow-500 flex-shrink-0" size={24} />
              <h1 className="text-2xl">
                Are you sure you want to approve <span className="font-semibold">{hack.title}</span>?
              </h1>
            </div>
            <p className="text-foreground/75 mb-6">
              By approving this hack, it will become visible to the public.
            </p>
            <form action={handleApprove} className="flex gap-3 justify-center md:justify-start">
              <Button type="submit" variant="primary">
                Approve
              </Button>
              <Link href={`/hack/${slug}`}>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

