"use client";

import React from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import { FiChevronDown, FiCode, FiFlag, FiGlobe, FiImage, FiMessageSquare, FiMusic } from "react-icons/fi";
import { AI_AREAS, AI_HEADLINES, AI_LEVEL_LABEL, AI_LEVEL_STEP, aiKind, type AiArea, type AiDisclosure } from "@/utils/aiDisclosure";

export const AI_AREA_ICONS: Record<AiArea, IconType> = {
  graphics: FiImage,
  music: FiMusic,
  story: FiMessageSquare,
  translation: FiGlobe,
  events: FiFlag,
  code: FiCode,
};

/** Strip shade per step, from empty to solid. The same level word always gets the same shade. */
const SHADE = [
  "bg-surface-2 text-line-strong",
  "bg-[color-mix(in_srgb,var(--text)_18%,var(--surface-2))] text-text",
  "bg-[color-mix(in_srgb,var(--text)_42%,var(--surface-2))] text-surface",
  "bg-[color-mix(in_srgb,var(--text)_70%,var(--surface-2))] text-surface",
  "bg-text text-surface",
];

const listFormat = new Intl.ListFormat("en", { type: "conjunction" });

/**
 * The hack page's AI label: a headline, a six-cell strip (five content areas,
 * then code), and a collapsible breakdown listing only the areas with AI.
 * While the breakdown is open, hovering a row highlights its cell and the other way around.
 */
export default function AiLabel({ disclosure, defaultOpen = false }: { disclosure: AiDisclosure; defaultOpen?: boolean }) {
  const { levels, note } = disclosure;
  const [open, setOpen] = React.useState(defaultOpen);
  const [hot, setHot] = React.useState<AiArea | null>(null);
  const bodyId = React.useId();
  const used = AI_AREAS.filter((a) => levels[a.key] !== "none");
  const unused = AI_AREAS.filter((a) => levels[a.key] === "none").map((a) => a.short);
  // Links a cell to its row, so only while the breakdown is open (otherwise the cell looks clickable).
  // Mouse only: a tap fires enter without leave, which left the cell looking selected on phones.
  const hover = (key: AiArea) => ({
    onPointerEnter: (e: React.PointerEvent) => open && e.pointerType === "mouse" && setHot(key),
    onPointerLeave: () => setHot(null),
  });

  return (
    <div className="rounded-card border border-line bg-surface px-3.5 py-3 shadow-rest">
      <div className="flex items-baseline justify-between gap-2.5">
        <b className="font-display text-[20px] font-extrabold leading-[1.1] tracking-[-.015em]">{AI_HEADLINES[aiKind(levels)]}</b>
        <span className="whitespace-nowrap text-[12.5px] text-text-2">Updated {shortDate(disclosure.disclosedAt)}</span>
      </div>

      <div
        role="img"
        aria-label={AI_AREAS.map((a) => `${a.name}: ${AI_LEVEL_LABEL[levels[a.key]]}`).join(", ")}
        className="mt-2.5 grid grid-cols-[repeat(5,1fr)_6px_1fr] gap-[3px]"
      >
        {AI_AREAS.map((a) => {
          const Icon = AI_AREA_ICONS[a.key];
          return (
            <React.Fragment key={a.key}>
              {a.key === "code" && <span />}
              <span
                {...hover(a.key)}
                title={`${a.name}: ${AI_LEVEL_LABEL[levels[a.key]]}`}
                className={`flex h-[30px] items-center justify-center rounded-[5px] transition-[translate,box-shadow] duration-[140ms] ease-out ${SHADE[AI_LEVEL_STEP[levels[a.key]]]} ${
                  hot === a.key ? "-translate-y-0.5 shadow-[0_0_0_2px_var(--surface),0_0_0_3.5px_var(--text)]" : ""
                }`}
              >
                <Icon className="h-[15px] w-[15px]" />
              </span>
            </React.Fragment>
          );
        })}
      </div>
      <div aria-hidden className="mt-1 grid grid-cols-[5fr_6px_1fr] gap-[3px] text-[10.5px] text-text-3">
        <span>What you see and hear</span>
        <span />
        <span className="text-center">Code</span>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="group mt-2.5 flex w-full items-center gap-1.5 border-t border-line pt-1.5 text-left text-[13px] text-text-2 transition-colors hover:text-text"
      >
        Breakdown
        <FiChevronDown className="ml-auto h-4 w-4 text-text-3 transition-transform duration-[180ms] group-aria-expanded:rotate-180" />
      </button>
      <div id={bodyId} className={`grid transition-[grid-template-rows] duration-[240ms] ease-[cubic-bezier(.2,.8,.2,1)] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} inert={!open}>
        <div className="min-h-0 overflow-hidden">
          {used.length > 0 && (
            <ul className="mt-2 border-t-2 border-text">
              {used.map((a) => {
                const Icon = AI_AREA_ICONS[a.key];
                const level = levels[a.key];
                // "A little" reads quieter than the other levels.
                const quiet = level === "little";
                return (
                  <li
                    key={a.key}
                    {...hover(a.key)}
                    className={`grid grid-cols-[16px_1fr_auto_44px] items-center gap-2 border-b border-line py-1.5 text-[13.5px] leading-[1.35] transition-colors duration-[140ms] ${hot === a.key ? "bg-surface-2" : ""}`}
                  >
                    <Icon className="h-4 w-4 text-text-2" />
                    <span>{a.name}</span>
                    <Meter step={AI_LEVEL_STEP[level]} quiet={quiet} />
                    <span className={`text-right text-[12.5px] ${quiet ? "font-medium text-text-3" : "font-semibold"}`}>{AI_LEVEL_LABEL[level]}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className={`text-[12.5px] leading-[1.4] text-text-3 ${used.length ? "pt-1.5" : "mt-2 border-t-2 border-text pt-1.5"}`}>
            {used.length === 0 ? "No AI in any area." : unused.length > 0 && `No AI in ${listFormat.format(unused)}.`}
          </p>
          {note && (
            <div className="mt-2.5 whitespace-pre-line border-l-2 border-line-strong py-px pl-2.5 text-[13px] leading-[1.45] text-text-2">
              <small className="mb-0.5 block text-[11.5px] font-semibold text-text-3">From the creator</small>
              {note}
            </div>
          )}
          <p className="mt-2.5 text-[11.5px] text-text-3">
            Reported by the creator.{" "}
            <Link href="/faq#ai-disclosure" prefetch={false} className="text-link-hd">
              What the levels mean
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Meter({ step, quiet }: { step: number; quiet: boolean }) {
  return (
    <span aria-hidden className="inline-grid grid-cols-[repeat(4,8px)] gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={`h-2 rounded-[2px] ${i > step ? "bg-surface-3" : quiet ? "bg-text-3" : "bg-text"}`} />
      ))}
    </span>
  );
}

/** Shown for hacks from before disclosure was required, until the creator fills it in. */
export function AiLabelMissing({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong px-3.5 py-3 text-[13px] leading-[1.45] text-text-3">
      The creator hasn&rsquo;t filled in the AI label yet.
      {children}
    </div>
  );
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}
