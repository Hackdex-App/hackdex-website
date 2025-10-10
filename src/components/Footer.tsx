import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-8 text-sm text-foreground/70">
        <p>© {new Date().getFullYear()} Hackdex</p>
        <div className="flex items-center gap-4">
          <Link href="/discover" className="hover:underline">
            Discover
          </Link>
          <Link href="/submit" className="hover:underline">
            Submit
          </Link>
          <Link href="/login" className="hover:underline font-medium text-foreground">
            Already a creator? Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}


