"use client";

import Link from "next/link";
import { useAuthContext } from "@/contexts/AuthContext";

/**
 * "Log in" for guests, "Dashboard" once a session is known. The auth context
 * starts empty on both server and client, so the static footer always ships
 * "Log in" and the swap happens after mount without a hydration mismatch.
 */
export default function FooterAccountLink() {
  const { user } = useAuthContext();
  const link = user ? { href: "/dashboard", label: "Dashboard" } : { href: "/login", label: "Log in" };
  return (
    <Link href={link.href} className="hover:text-text hover:underline hover:underline-offset-[3px]">
      {link.label}
    </Link>
  );
}
