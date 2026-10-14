"use client";

import Link from "next/link";
import { useAuthContext } from "@/contexts/AuthContext";

/**
 * The footer's account links: "Become a creator" and "Creator log in" for
 * guests, "Dashboard" once a session is known. The auth context starts empty on
 * both server and client, so the static footer always ships the guest links and
 * the swap happens after mount without a hydration mismatch.
 */
export default function FooterAccountLinks({ className }: { className: string }) {
  const { user } = useAuthContext();
  const links = user
    ? [{ href: "/dashboard", label: "Dashboard" }]
    : [
        { href: "/signup", label: "Become a creator" },
        { href: "/login", label: "Creator log in" },
      ];
  return links.map((l) => (
    <Link key={l.href} href={l.href} className={className}>
      {l.label}
    </Link>
  ));
}
