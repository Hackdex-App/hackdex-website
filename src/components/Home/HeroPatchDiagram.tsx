"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { IoGameControllerOutline } from "react-icons/io5";

const HOMEPAGE_HACKS = [
  { title: "Too Many Types 2", src: "/homepage/too-many-types-2.png" },
  { title: "Pokémon Odyssey", src: "/homepage/pokemon-odyssey.png" },
  { title: "Super Mariomon", src: "/homepage/super-mariomon.png" },
  { title: "Sword and Shield Ultimate Plus", src: "/homepage/sword-and-shield-ultimate-plus.png" },
  { title: "Pokémon Crystal Advance Redux", src: "/homepage/pokemon-crystal-advance-redux.png" },
  { title: "Pokémon ROWE", src: "/homepage/pokemon-rowe.png" },
  { title: "Emerald Rogue", src: "/homepage/emerald-rogue.png" },
  { title: "Celia's Stupid Romhack", src: "/homepage/celias-stupid-romhack.gif" },
  { title: "Pokémon Unbound", src: "/homepage/pokemon-unbound.png" },
] as const;

type Pick = (typeof HOMEPAGE_HACKS)[number] & { delay: string };

export default function HeroPatchDiagram() {
  const [picks, setPicks] = useState<Pick[]>([]);

  useEffect(() => {
    setPicks(
      [...HOMEPAGE_HACKS]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((h, i) => ({ ...h, delay: `${i * 0.6}s` }))
    );
  }, []);

  const slots: (Pick | null)[] = picks.length === 3 ? picks : [null, null, null];

  return (
    <div className="relative mx-auto w-full max-w-full" aria-hidden="true">
      <div className="flex w-full flex-col items-center gap-0">
        {/* Base ROM card */}
        <div className="card relative z-10 w-full max-w-64 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
              <IoGameControllerOutline size={18} className="text-foreground/70" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight">Your base ROM</div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span className="truncate text-xs text-emerald-400">Cached on this device</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connectors + cards share one shrink-wrapped width so they stay centered together */}
        <div className="flex w-full max-w-md flex-col items-center md:w-fit md:max-w-none">
          <div className="relative h-14 w-full sm:h-[4.75rem]">
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 416 76"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path
                className="hero-connector-path"
                d="M208 0 C208 28, 68 28, 68 56"
                stroke="var(--border)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                className="hero-connector-path"
                d="M208 0 C208 36, 208 36, 208 76"
                stroke="var(--border)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                className="hero-connector-path"
                d="M208 0 C208 28, 348 28, 348 56"
                stroke="var(--border)"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>

          <div className="relative z-10 flex w-full items-start gap-2 sm:gap-3 xl:gap-4">
            {slots.map((hack, index) => (
              <div
                key={index}
                data-ready={hack ? "true" : "false"}
                className={`hero-hack-card card anim-float min-w-0 flex-1 p-2 sm:p-2.5 md:w-32 md:flex-none lg:w-36 xl:w-40 ${index === 1 ? "mt-3 sm:mt-5" : ""}`}
                style={{ animationDelay: hack?.delay ?? `${index * 0.6}s` }}
              >
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-md bg-[var(--surface-2)]">
                  {hack && (
                    <Image
                      src={hack.src}
                      alt=""
                      fill
                      sizes="160px"
                      className="hero-hack-image object-cover"
                      unoptimized={hack.src.endsWith(".gif")}
                    />
                  )}
                </div>
                <div data-ready={hack ? "true" : "false"} className="mt-1.5 truncate text-[11px] font-medium tracking-tight text-foreground/85 sm:mt-2 sm:text-xs opacity-0 data-[ready=true]:opacity-100 transition-opacity duration-500">
                  {hack?.title ?? "\u00A0" /* non-breaking space */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
