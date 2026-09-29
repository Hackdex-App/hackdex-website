"use client";

import Link from "next/link";
import React from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { FiX } from "react-icons/fi";
import { useDialog } from "@/hooks/useDialog";

const PAGES = [
  { href: "/submit", label: "Submit a hack" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const SMALL = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "https://github.com/Hackdex-App/hackdex-website", label: "GitHub" },
  { href: "https://github.com/orgs/Hackdex-App/projects/4", label: "Roadmap" },
];

/** Slide-in time; the drawer stays mounted this long after closing so it can slide back out. */
const SLIDE_MS = 240;

/**
 * Phone-only menu for the pages the tab bar leaves out: Submit, account, FAQ,
 * Contact. The drawer slides in from the right under the header, so the
 * three-bar button stays in view and folds into its close X. Closes on
 * navigation, Escape, and scrim tap.
 */
export default function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [inView, setInView] = React.useState(false);
  const pathname = usePathname();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const drawerId = React.useId();

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const enter = requestAnimationFrame(() => requestAnimationFrame(() => setInView(true)));
      return () => cancelAnimationFrame(enter);
    }
    setInView(false);
    const leave = setTimeout(() => setMounted(false), SLIDE_MS);
    return () => clearTimeout(leave);
  }, [open]);

  React.useEffect(() => setOpen(false), [pathname]);

  const close = React.useCallback(() => setOpen(false), []);
  useDialog(panelRef, close, mounted && open);

  // Only creators need an account, so the guest links say so; players should never read them as a gate.
  const account = signedIn
    ? { label: "Your account", links: [{ href: "/dashboard", label: "Dashboard" }, { href: "/account", label: "Account settings" }] }
    : { label: "For creators", links: [{ href: "/signup", label: "Become a creator" }, { href: "/login", label: "Creator log in" }] };

  let step = 0;
  const item = (href: string, label: string, className: string) => {
    const external = href.startsWith("http");
    return (
      <Link
        key={href}
        href={href}
        onClick={close}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        aria-current={pathname === href ? "page" : undefined}
        style={{ transitionDelay: inView ? `${60 + step++ * 25}ms` : "0ms" }}
        className={`transition-[opacity,translate,background-color,color] duration-200 ease-out ${inView ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"} ${className}`}
      >
        {label}
      </Link>
    );
  };
  const row = "flex h-12 items-center rounded-control px-3 text-[15px] font-medium text-text hover:bg-surface-2 aria-[current=page]:text-accent-text";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={drawerId}
        aria-label={open ? "Close menu" : "Open menu"}
        className="group relative inline-flex h-[38px] w-[38px] items-center justify-center rounded-control text-text-2 transition-colors hover:bg-surface-2 hover:text-text md:hidden"
      >
        <span aria-hidden className="relative block h-3.5 w-[18px]">
          {[
            "top-0 group-aria-expanded:top-1.5 group-aria-expanded:rotate-45",
            "top-1.5 group-aria-expanded:opacity-0",
            "top-3 group-aria-expanded:top-1.5 group-aria-expanded:-rotate-45",
          ].map((pos) => (
            <span key={pos} className={`absolute left-0 h-0.5 w-full rounded-full bg-current transition-[top,rotate,opacity] duration-200 ease-out ${pos}`} />
          ))}
        </span>
      </button>

      {mounted &&
        createPortal(
          // Starts under the header (56px + its 1px border) so the toggle stays visible.
          <div className="fixed inset-x-0 bottom-0 top-[57px] z-50 md:hidden" role="presentation">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Close menu"
              onClick={close}
              className={`absolute inset-0 cursor-default bg-[rgba(13,16,23,.4)] transition-opacity duration-200 ${inView ? "opacity-100" : "opacity-0"}`}
            />
            <div
              ref={panelRef}
              id={drawerId}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              tabIndex={-1}
              style={{ transitionDuration: `${SLIDE_MS}ms` }}
              className={`absolute inset-y-0 right-0 flex w-[min(320px,86vw)] flex-col rounded-bl-[20px] border-l border-line bg-surface text-text shadow-overlay outline-none transition-transform ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${
                inView ? "translate-x-0" : "translate-x-full"
              }`}
            >
              {/* The header toggle closes it visually; this keeps a close control inside the focus trap. */}
              <button type="button" onClick={close} className="sr-only focus:not-sr-only focus:m-2 focus:inline-flex focus:h-10 focus:items-center focus:gap-1.5 focus:rounded-control focus:px-3 focus:text-sm focus:font-medium">
                <FiX className="h-4 w-4" /> Close menu
              </button>
              <nav aria-label="Menu" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 py-3">
                {PAGES.map((p) => item(p.href, p.label, row))}
                <div className="mx-3 my-3 border-t border-line" />
                <p className="px-3 pb-0.5 pt-1 text-xs font-semibold tracking-[.01em] text-text-3">{account.label}</p>
                {account.links.map((a) => item(a.href, a.label, row))}
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-6">
                  {SMALL.map((s) => item(s.href, s.label, "text-[13px] text-text-3 hover:text-text"))}
                </div>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
