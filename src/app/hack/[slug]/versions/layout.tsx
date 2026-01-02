import { createClient } from "@/utils/supabase/server";
import { FiAlertTriangle } from "react-icons/fi";

interface VersionsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function VersionsLayout({ children, params }: VersionsLayoutProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Only show banner if user is logged in
  if (!user) {
    return <>{children}</>;
  }

  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return <>{children}</>;
  }

  // Fetch only the minimal field needed to check ownership
  const { data: hack } = await supabase
    .from("hacks")
    .select("created_by")
    .eq("slug", slug)
    .maybeSingle();

  if (!hack) {
    return <>{children}</>;
  }

  // Show banner if admin is not the creator (admins can edit any hack)
  const showBanner = hack.created_by !== user.id;

  if (!showBanner) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="sticky top-16 z-30 w-full border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-100">
        <div className="mx-auto flex max-w-screen-md items-center px-4 sm:px-6 py-2 text-sm">
          <FiAlertTriangle className="mr-2 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="line-clamp-3">
            You are editing a hack that you do not own. Please be careful with your changes.
          </p>
        </div>
      </div>
      {children}
    </>
  );
}

