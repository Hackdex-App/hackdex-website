import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/db";

export function createClient() {
  // Create a supabase client on the browser with project's credentials
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
