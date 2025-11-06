import Link from "next/link";
import { Suspense } from "react";
import ContactForm from "@/components/Contact/ContactForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="mx-auto my-auto max-w-2xl w-full px-6 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Contact Hackdex</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Have a question, feedback, or need help? Use this form to reach out to us.
        </p>
        <p className="mt-1 text-sm text-foreground/60">
          For intellectual property concerns (DMCA), please see our <Link className="text-[var(--accent)] hover:underline" href="/terms">Terms of Service</Link>.
        </p>
        <div className="mt-6">
          <Suspense fallback={<div>Loading...</div>}>
            <ContactForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
