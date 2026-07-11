"use client";

import Link from "next/link";
import { useAuthContext } from "@/contexts/AuthContext";

const linkClassName =
  "inline-flex h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-md sm:px-5 text-base font-medium text-foreground/90 hover:underline";

export default function HeroAuthCta() {
  const { user } = useAuthContext();

  if (user) {
    return (
      <Link href="/dashboard" className={linkClassName}>
        Go to dashboard
      </Link>
    );
  }

  return (
    <Link href="/login" className={linkClassName}>
      Already a creator? Log in
    </Link>
  );
}
