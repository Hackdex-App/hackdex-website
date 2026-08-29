import Avatar from "@/components/Account/Avatar";
import CollapsibleCard from "@/components/Primitives/CollapsibleCard";
import CollapsibleTags from "@/components/Hack/CollapsibleTags";
import CreateReviewThreadMenuItem from "@/components/Hack/CreateReviewThreadMenuItem";
import DownloadsBadge from "@/components/Hack/DownloadsBadge";
import Gallery from "@/components/Hack/Gallery";
import HackActions from "@/components/Hack/HackActions";
import HackOptionsMenu from "@/components/Hack/HackOptionsMenu";
import HackShareButton from "@/components/Hack/HackShareButton";
import PokeCommunityIcon from "@/components/Icons/PokeCommunityIcon";
import Markdown from "@/components/Markdown/Markdown";
import { getHackPageUrl } from "@/app/hack/[slug]/hack-page-shared";
import type { HackMetadata } from "@/app/hack/[slug]/actions";
import { baseRoms, PLATFORM_NAMES } from "@/data/baseRoms";
import {
  isArchiveHack,
  isDownloadableArchiveHack,
  isInformationalArchiveHack,
} from "@/utils/hack";
import { MenuItem } from "@headlessui/react";
import Image from "next/image";
import Link from "next/link";
import {
  FaArrowUpRightFromSquare,
  FaCircleCheck,
  FaDiscord,
  FaGithub,
  FaTriangleExclamation,
  FaTwitter,
} from "react-icons/fa6";
import { FiAlertTriangle, FiInfo, FiMail } from "react-icons/fi";
import { RiArchiveStackFill } from "react-icons/ri";
import { TbProgressCheck } from "react-icons/tb";
import type { CreativeWork, WithContext } from "schema-dts";
import serialize from "serialize-javascript";

interface HackDetailViewProps {
  metadata: HackMetadata;
  downloads: number | null;
  canEdit: boolean;
  canUploadPatch: boolean;
  isAdmin: boolean;
  hasReviewThread?: boolean;
}

export default function HackDetailView({
  metadata,
  downloads,
  canEdit,
  canUploadPatch,
  isAdmin,
  hasReviewThread = false,
}: HackDetailViewProps) {
  const { hack, images, tags, profile, otherHacks, patch, displayVersion } =
    metadata;
  const baseRom = baseRoms.find((rom) => rom.id === hack.base_rom);
  const author = hack.original_author
    ? hack.original_author
    : profile?.username
      ? `@${profile.username}`
      : "Unknown";
  const isInformationalArchive = isInformationalArchiveHack(hack);
  const isDownloadableArchive = isDownloadableArchiveHack(hack);
  const isArchive = isArchiveHack(hack);
  const patchFilename = patch?.filename || null;
  const patchVersion = displayVersion;
  const patchId = patch?.id || null;
  const lastUpdated = patch
    ? new Date(patch.created_at).toLocaleDateString()
    : null;
  const patchCreatedAt = patch?.created_at || null;
  const patchChangelog = patch?.changelog || null;
  const hasMissingPatch = !hack.approved && patchId === null;
  const hasMissingScreenshots = !hack.approved && images.length === 0;
  const pageUrl = getHackPageUrl(hack.slug);
  const authorName = hack.original_author || profile?.username || "Unknown";
  const social = hack.social_links as {
    discord?: string;
    twitter?: string;
    pokecommunity?: string;
    github?: string;
  } | null;
  const sameAs = [
    social?.discord,
    social?.twitter,
    social?.pokecommunity,
  ].filter((url): url is string => Boolean(url));
  const commonTags = [
    "Pokémon",
    "ROM Hack",
    "Patch",
    "BPS",
    "Romhack",
    "Pokemon",
    "Mod",
    "Game",
    "Hack",
  ];
  if (baseRom) {
    commonTags.push(
      PLATFORM_NAMES[baseRom.platform],
      baseRom.platform,
      baseRom.name,
    );
  }

  const jsonLd: WithContext<CreativeWork> = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: hack.title,
    description: hack.summary || undefined,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    image: images.length ? images : undefined,
    thumbnailUrl: images.length ? images[0] : hack.box_art || undefined,
    author: { "@type": "Person", name: authorName },
    sameAs: sameAs.length ? sameAs : undefined,
    genre: "Game Mod",
    dateCreated: new Date(hack.created_at).toISOString(),
    dateModified: new Date(
      patchCreatedAt || hack.updated_at || hack.created_at,
    ).toISOString(),
    keywords: tags.length ? [...tags, ...commonTags] : commonTags,
    version: patchVersion || undefined,
    inLanguage: "en",
    isAccessibleForFree: true,
    isBasedOn: baseRom
      ? {
          "@type": "VideoGame",
          name: baseRom.name,
          gamePlatform: PLATFORM_NAMES[baseRom.platform],
        }
      : undefined,
  };

  return (
    <div className="mx-auto max-w-screen-lg w-full pb-28">
      <div style={{ display: "none" }} aria-hidden="true">
        <a
          href={`/api/download/${hack.slug}/${hack.slug}.bps`}
          tabIndex={-1}
          aria-hidden="true"
        />
        <a
          href={`/api/download/${hack.slug}/patch.bps`}
          tabIndex={-1}
          aria-hidden="true"
        />
        <a
          href={`/api/download/${hack.slug}/download.bps`}
          tabIndex={-1}
          aria-hidden="true"
        />
        <a
          href={`/api/download/${hack.slug}/rom.${baseRom?.platform?.toLowerCase() || "gba"}`}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serialize(jsonLd, { isJSON: true }),
        }}
      />
      {!isInformationalArchive && !hasMissingPatch && (
        <HackActions
          title={hack.title}
          version={patchVersion || "Pre-release"}
          author={author}
          baseRomId={baseRom?.id || ""}
          platform={baseRom?.platform}
          patchFilename={patchFilename}
          patchId={patchId ?? undefined}
          hackSlug={hack.slug}
          patcherSelector={metadata.patcherSelector}
        />
      )}

      {isInformationalArchive && (
        <div className="flex flex-row items-center gap-4 mx-6 mt-6 rounded-lg border-2 border-rose-500/40 bg-rose-50 dark:bg-rose-900/10 p-4 md:pl-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex-shrink-0">
              <RiArchiveStackFill
                className="text-rose-600 dark:text-rose-400"
                size={28}
              />
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-0.5 md:mb-1">
                Archive Entry
              </h3>
              <p className="text-sm text-rose-800 dark:text-rose-200">
                This is an archive entry for informational and preservation
                purposes only. No patch file is available for download.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hack.approved && (
        <>
          {hasMissingPatch &&
            (isAdmin ? (
              <PendingWarning
                title="This hack is missing a patch file."
                description="A patch file must be uploaded before this hack can be approved. Please try to ask the creator to upload a patch file."
              />
            ) : (
              <PendingWarning
                title="Your hack is missing a patch file."
                description="You need to upload a patch file before an admin can approve your hack. Use the options menu to upload a patch file."
              />
            ))}
          {hasMissingScreenshots &&
            (isAdmin ? (
              <PendingWarning
                title="This hack is missing screenshots."
                description="Screenshots should be uploaded before this hack can be approved. Please try to ask the creator to add screenshots."
              />
            ) : (
              <PendingWarning
                title="Your hack is missing screenshots."
                description="You should add screenshots before an admin can approve your hack. Use the options menu to add screenshots."
              />
            ))}
          {!hasMissingPatch &&
            !hasMissingScreenshots &&
            (isAdmin ? (
              <PendingWarning
                title="You are viewing this unpublished hack as an admin."
                description="This hack is pending approval. Please review the contents of this hack before making a decision. Then choose Approve from the dropdown options."
              />
            ) : (
              <PendingWarning
                title="Your hack is pending approval."
                description="Your hack is currently under review and will be visible to all users once approved by an admin."
              />
            ))}
          {isAdmin && hack.verification_contact_info && (
            <div className="mx-6 mt-6 rounded-lg border-2 border-blue-500/60 bg-blue-50 dark:bg-blue-900/20 p-4 md:pl-6">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="flex-shrink-0">
                  <FiInfo
                    className="text-blue-600 dark:text-blue-400"
                    size={24}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Verification Contact Information
                  </h3>
                  <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-line">
                    {hack.verification_contact_info}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="pt-8 md:pt-10 px-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-wrap md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {hack.title}
              </h1>
              {hasMissingPatch ? (
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-600/20 dark:bg-amber-600/40 px-2 py-0.5 text-xs font-medium text-amber-900/90 dark:text-amber-200/90">
                  <FiAlertTriangle className="h-3 w-3 text-amber-900/90 dark:text-amber-200/90" />
                  <span>Missing Patch</span>
                </div>
              ) : (
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-foreground/85 ring-1 ring-[var(--border)]">
                  {patchVersion || "Pre-release"}
                </span>
              )}
              {!isArchive && (
                <div className="inline-flex ml-auto md:hidden">
                  <DownloadsBadge
                    slug={hack.slug}
                    initialCount={downloads ?? 0}
                  />
                </div>
              )}
            </div>
            <div
              className={`mt-1 flex items-center ${!hack.original_author ? "h-[28px]" : ""}`}
            >
              {!hack.original_author ? (
                <>
                  <Avatar
                    uid={hack.created_by}
                    url={profile?.avatar_url ?? null}
                    size={28}
                  />
                  <p className="text-[16px] md:text-[18px] text-foreground/70 ml-2">
                    {author}
                  </p>
                  {isAdmin && profile?.verified && (
                    <div className="relative flex items-center group">
                      <FaCircleCheck
                        className="text-foreground/70 ml-1"
                        size={16}
                      />
                      <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 group-hover:block group-hover:opacity-100">
                        Creator is verified
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[16px] md:text-[18px] text-foreground/70">
                  By {author}
                </p>
              )}
            </div>
            {hack.completion_status &&
              hack.completion_status !== "Complete" && (
                <p className="w-fit rounded-full bg-[var(--surface-2)] mt-4 px-2 py-0.5 font-bold text-foreground/85 ring-1 ring-[var(--border)]">
                  <TbProgressCheck
                    className="inline-block align-middle mr-1 text-foreground/85"
                    size={18}
                  />
                  {hack.completion_status}
                </p>
              )}
            <p
              className={`${!isArchive && (!hack.completion_status || hack.completion_status === "Complete") ? "mt-4" : "mt-2"} text-sm text-foreground/75`}
            >
              {hack.summary}
            </p>
          </div>
          <div className="w-full mt-2 flex flex-col justify-between gap-2 md:gap-6 md:flex-row md:items-end">
            <CollapsibleTags tags={tags} />
            <div className="flex items-center justify-end gap-2 self-end md:self-auto lg:min-w-[260px]">
              {!isArchive && (
                <div className="hidden md:inline-flex mr-2">
                  <DownloadsBadge
                    slug={hack.slug}
                    initialCount={downloads ?? 0}
                  />
                </div>
              )}
              <HackShareButton
                title={hack.title}
                url={pageUrl}
                author={hack.original_author || profile?.username || null}
              />
              <HackOptionsMenu
                slug={hack.slug}
                canEdit={canEdit}
                canUploadPatch={canUploadPatch}
              >
                {isAdmin && !hack.approved && (
                  <MenuItem
                    as="a"
                    href={`/hack/${hack.slug}/approve`}
                    className="block w-full px-3 py-2 text-left text-sm text-green-500 font-medium data-focus:bg-black/5 dark:data-focus:bg-white/10"
                  >
                    <FaCircleCheck
                      className="mr-2 inline-block align-middle mb-0.5 text-green-500"
                      size={12}
                    />
                    Approve
                  </MenuItem>
                )}
                {isAdmin && profile?.email && (
                  <MenuItem
                    as="a"
                    href={`mailto:${profile.email}`}
                    className="block w-full px-3 py-2 text-left text-sm text-foreground/80 font-medium data-focus:bg-black/5 dark:data-focus:bg-white/10"
                  >
                    <FiMail
                      className="mr-2 inline-block align-middle mb-0.5 text-foreground/80"
                      size={12}
                    />
                    Contact creator
                  </MenuItem>
                )}
                {isAdmin && !isArchive && !hasReviewThread && (
                  <CreateReviewThreadMenuItem slug={hack.slug} />
                )}
              </HackOptionsMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 px-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-6 lg:min-w-[640px]">
          <Gallery images={images} title={hack.title} />

          {patchId && patchCreatedAt && (
            <CollapsibleCard
              title={`${patchVersion || "Pre-release"} released on ${new Date(
                patchCreatedAt,
              ).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`}
              className="card-simple"
            >
              {patchChangelog && patchChangelog.trim().length > 0 ? (
                <div className="prose prose-sm max-w-none text-foreground/80">
                  <Markdown headingLevelOffset={1}>{patchChangelog}</Markdown>
                </div>
              ) : (
                <p className="italic text-foreground/60">
                  No changelog provided
                </p>
              )}
            </CollapsibleCard>
          )}

          <div className="card-simple p-5">
            <h2 className="text-2xl font-semibold tracking-tight">
              About this hack
            </h2>
            <div className="prose prose-sm mt-3 max-w-none text-foreground/80">
              <Markdown headingLevelOffset={1}>{hack.description}</Markdown>
            </div>
          </div>
        </div>

        <aside className="space-y-6 self-start w-full lg:w-auto">
          <div className="card p-5">
            <h3 className="text-[15px] font-semibold tracking-tight">
              Details
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-foreground/75">
              <li>Language: {hack.language || "Unknown"}</li>
              <li>Base ROM: {baseRom?.name || "Unknown"}</li>
              <li>
                First uploaded:{" "}
                {new Date(hack.created_at).toLocaleDateString()}
              </li>
              {lastUpdated && <li>Last updated: {lastUpdated}</li>}
              {social && (
                <li className="flex flex-wrap items-center justify-center gap-4 mt-4">
                  {social.discord && (
                    <SocialLink href={social.discord}>
                      <FaDiscord size={32} />
                    </SocialLink>
                  )}
                  {social.twitter && (
                    <SocialLink href={social.twitter}>
                      <FaTwitter size={32} />
                    </SocialLink>
                  )}
                  {social.pokecommunity && (
                    <SocialLink href={social.pokecommunity}>
                      <PokeCommunityIcon
                        width={32}
                        height={32}
                        color="currentColor"
                      />
                    </SocialLink>
                  )}
                  {social.github && (
                    <SocialLink href={social.github}>
                      <FaGithub size={32} />
                    </SocialLink>
                  )}
                </li>
              )}
            </ul>
          </div>
          {hack.box_art && (
            <div className="card overflow-hidden pb-6 lg:pb-0">
              <div className="flex items-center justify-between">
                <div className="px-5 py-3 text-[15px] font-semibold tracking-tight">
                  Box art
                </div>
                <a
                  className="px-5 py-3 text-[15px] tracking-tight text-foreground/70 hover:underline"
                  href={hack.box_art}
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </div>
              <div className="relative aspect-square w-full max-h-[340px]">
                <Image
                  src={hack.box_art}
                  alt={`${hack.title} box art`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}
          {otherHacks.length > 0 && (
            <div className="card p-5">
              <h3 className="text-[15px] font-semibold tracking-tight">
                More from {author}
              </h3>
              <ul className="mt-3 space-y-3 text-sm text-foreground/75">
                {otherHacks.map((otherHack) => (
                  <li key={otherHack.slug}>
                    <Link
                      href={`/hack/${otherHack.slug}`}
                      prefetch={false}
                      target="_blank"
                      className="group block hover:text-foreground"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium group-hover:underline underline-offset-2">
                          {otherHack.title}
                        </span>
                        <FaArrowUpRightFromSquare
                          className="inline-block shrink-0"
                          size={12}
                        />
                      </div>
                      {otherHack.summary && (
                        <p className="mt-1 text-xs text-foreground/60 group-hover:text-foreground line-clamp-2">
                          {otherHack.summary}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isInformationalArchive ? (
            <div className="card overflow-hidden p-4 mt-4 text-sm text-foreground/60">
              <p>
                This is an archive entry for{" "}
                <span className="font-semibold">{hack.title}</span> preserved
                for informational purposes.
                {hack.original_author && (
                  <span>
                    {" "}
                    The original author of this hack is{" "}
                    <span className="font-semibold">
                      {hack.original_author}
                    </span>
                    .
                  </span>
                )}
              </p>
              <p className="mt-2">
                Archive entries do not include patch files and are maintained
                for historical reference and preservation purposes only.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden p-4 mt-4 text-sm text-foreground/60">
              <p>
                This page provides{" "}
                {isDownloadableArchive ? "an archived" : "the official"} patch
                file for <span className="font-semibold">{hack.title}</span>
                {isDownloadableArchive
                  ? " with permission from the original creator"
                  : ""}
                . You can safely download the patched ROM for this hack using
                our built-in patcher.
              </p>
              <p className="mt-2">
                By pressing &quot;Agree and Patch&quot;, your browser will
                download and apply the{" "}
                <span className="font-semibold">{hack.title}</span> patch file
                to your legally-obtained{" "}
                <span className="font-semibold">{baseRom?.name}</span> ROM. The
                patched ROM will then be automatically downloaded.
              </p>
              <p className="mt-2">
                No pre-patched ROMs or base ROMs are hosted or distributed on
                this site. All patching is done locally on your device.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function PendingWarning({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-6 mt-6 rounded-lg border-2 border-yellow-500/60 bg-yellow-50 dark:bg-yellow-900/20 p-4 md:pl-6">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex-shrink-0">
          <FaTriangleExclamation
            className="text-yellow-600 dark:text-yellow-400"
            size={24}
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            {title}
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function SocialLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="underline underline-offset-2 hover:text-foreground/90 hover:scale-110 transition-transform duration-300"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}
