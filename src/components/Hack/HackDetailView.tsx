import Avatar from "@/components/Account/Avatar";
import CollapsibleTags from "@/components/Hack/CollapsibleTags";
import CreateReviewThreadMenuItem from "@/components/Hack/CreateReviewThreadMenuItem";
import DownloadsBadge from "@/components/Hack/DownloadsBadge";
import HackActions from "@/components/Hack/HackActions";
import HackOptionsMenu from "@/components/Hack/HackOptionsMenu";
import HackShareButton from "@/components/Hack/HackShareButton";
import HackTabs, { type HackVersionRow } from "@/components/Hack/HackTabs";
import { DraftChecklist, DraftStatusStrip, type ChecklistItem, type DraftStage } from "@/components/Hack/DraftStatus";
import { DraftEditingProvider } from "@/components/Hack/Draft/DraftEditing";
import DraftHeader from "@/components/Hack/Draft/DraftHeader";
import DraftAbout from "@/components/Hack/Draft/DraftAbout";
import DraftGallery from "@/components/Hack/Draft/DraftGallery";
import DraftDetails, { EditDetailsLink } from "@/components/Hack/Draft/DraftDetails";
import type { CatalogTagRow } from "@/types/catalogTag";
import PokeCommunityIcon from "@/components/Icons/PokeCommunityIcon";
import Markdown from "@/components/Markdown/Markdown";
import { getHackPageUrl } from "@/app/hack/[slug]/hack-page-shared";
import type { HackMetadata } from "@/app/hack/[slug]/actions";
import { baseGameLabel, baseRoms, PLATFORM_NAMES } from "@/data/baseRoms";
import { EMULATORS } from "@/data/emulators";
import Handle from "@/components/Primitives/Handle";
import { isArchiveHack, isDownloadableArchiveHack, isInformationalArchiveHack } from "@/utils/hack";
import { formatRelativeDate } from "@/utils/format";
import { MenuItem } from "@headlessui/react";
import Image from "next/image";
import Link from "next/link";
import { FaCircleCheck, FaDiscord, FaGithub, FaTwitter } from "react-icons/fa6";
import { FiAlertTriangle, FiArrowUpRight, FiInfo, FiMail, FiUpload } from "react-icons/fi";
import { RiArchiveStackFill } from "react-icons/ri";
import type { CreativeWork, WithContext } from "schema-dts";
import serialize from "serialize-javascript";

/** Everything the in-place draft editor needs beyond the page metadata. */
export interface DraftEditorData {
  stage: DraftStage;
  checklist: { required: ChecklistItem[]; recommended: ChecklistItem[] };
  catalogTags: CatalogTagRow[];
  tagsUpdatedAt: string;
  /** Storage keys aligned with metadata.images. */
  coverKeys: string[];
  /** Set while the creator previews the draft as a player: the strip stays, the fields go. */
  preview: boolean;
  /** An admin editing a hack they did not create. */
  notOwner: boolean;
}

interface HackDetailViewProps {
  metadata: HackMetadata;
  downloads: number | null;
  canEdit: boolean;
  canUploadPatch: boolean;
  isAdmin: boolean;
  hasReviewThread?: boolean;
  /** Present on the session page when the creator is editing an unlisted hack in place. */
  editor?: DraftEditorData;
}

export default function HackDetailView({ metadata, downloads, canEdit, canUploadPatch, isAdmin, hasReviewThread = false, editor }: HackDetailViewProps) {
  const { hack, images, tags, profile, otherHacks, patch, displayVersion } = metadata;
  const baseRom = baseRoms.find((rom) => rom.id === hack.base_rom);
  const author = hack.original_author ? hack.original_author : profile?.username ? `@${profile.username}` : "Unknown";
  const isInformationalArchive = isInformationalArchiveHack(hack);
  const isDownloadableArchive = isDownloadableArchiveHack(hack);
  const isArchive = isArchiveHack(hack);
  const patchFilename = patch?.filename || null;
  const patchVersion = displayVersion;
  const patchId = patch?.id || null;
  const patchCreatedAt = patch?.created_at || null;
  const patchChangelog = patch?.changelog || null;
  const isDraft = !hack.approved && hack.submitted_at === null;
  const hasMissingPatch = !hack.approved && patchId === null;
  const hasMissingScreenshots = !hack.approved && images.length === 0;
  const pageUrl = getHackPageUrl(hack.slug);
  const authorName = hack.original_author || profile?.username || "Unknown";
  const social = hack.social_links as { discord?: string; twitter?: string; pokecommunity?: string; github?: string } | null;
  const sameAs = [social?.discord, social?.twitter, social?.pokecommunity].filter((url): url is string => Boolean(url));
  const commonTags = ["Pokémon", "ROM Hack", "Patch", "BPS", "Romhack", "Pokemon", "Mod", "Game", "Hack"];
  if (baseRom) commonTags.push(PLATFORM_NAMES[baseRom.platform], baseRom.platform, baseRom.name);

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
    dateModified: new Date(patchCreatedAt || hack.updated_at || hack.created_at).toISOString(),
    keywords: tags.length ? [...tags, ...commonTags] : commonTags,
    version: patchVersion || undefined,
    inLanguage: "en",
    isAccessibleForFree: true,
    isBasedOn: baseRom ? { "@type": "VideoGame", name: baseRom.name, gamePlatform: PLATFORM_NAMES[baseRom.platform] } : undefined,
  };

  // Versions a player can pick from; falls back to the current patch alone.
  const selectable = metadata.patcherSelector.selectablePatches;
  const versionRows: HackVersionRow[] = (
    selectable.length > 0
      ? selectable.map((p) => ({ id: p.id, version: p.version, createdAt: p.created_at }))
      : patch
        ? [{ id: patch.id, version: patchVersion || "Pre-release", createdAt: patch.created_at }]
        : []
  ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  if (versionRows[0]) versionRows[0].latest = true;

  const changes =
    patchId && patchCreatedAt
      ? {
          version: patchVersion || "Pre-release",
          date: new Date(patchCreatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
          body:
            patchChangelog && patchChangelog.trim().length > 0 ? (
              <Markdown headingLevelOffset={1}>{patchChangelog}</Markdown>
            ) : (
              <p className="italic text-text-3">No changelog provided</p>
            ),
        }
      : null;

  const lastUpdated = formatRelativeDate(patchCreatedAt);
  const showPatchModule = !isInformationalArchive && !hasMissingPatch;
  const editing = editor !== undefined && !editor.preview;
  const uploadHref = `/hack/${hack.slug}/edit/patch`;

  // Shared by both headers; the editor slots it between title and summary, as published.
  const byline = (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-text-2 md:text-base">
      {!hack.original_author && <Avatar uid={hack.created_by} url={profile?.avatar_url ?? null} size={24} />}
      <span>
        by <Handle name={author} className="font-medium text-text" />
      </span>
      {isAdmin && profile?.verified && !hack.original_author && (
        <span className="inline-flex items-center" title="Creator is verified">
          <FaCircleCheck className="text-text-3" size={14} />
        </span>
      )}
      {hasMissingPatch ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
          <FiAlertTriangle className="h-3 w-3" /> Missing patch
        </span>
      ) : (
        <>
          {patchId !== null && !isInformationalArchive && (
            <span className="rounded-full bg-surface-2 px-[7px] font-mono text-[11px] font-medium leading-[18px] text-text-2" title="Current version">
              {patchVersion || "Pre-release"}
            </span>
          )}
          {hack.completion_status && hack.completion_status !== "Complete" && (
            <span className="rounded-full border border-line-strong px-[7px] text-[11px] font-semibold leading-[18px] tracking-[.01em] text-text-2">{hack.completion_status}</span>
          )}
        </>
      )}
    </div>
  );

  const page = (
    <div className="mx-auto w-full max-w-[1164px] px-6">
      <div style={{ display: "none" }} aria-hidden="true">
        <a href={`/api/download/${hack.slug}/${hack.slug}.bps`} tabIndex={-1} aria-hidden="true" />
        <a href={`/api/download/${hack.slug}/patch.bps`} tabIndex={-1} aria-hidden="true" />
        <a href={`/api/download/${hack.slug}/download.bps`} tabIndex={-1} aria-hidden="true" />
        <a href={`/api/download/${hack.slug}/rom.${baseRom?.platform?.toLowerCase() || "gba"}`} tabIndex={-1} aria-hidden="true" />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(jsonLd, { isJSON: true }) }} />

      {isInformationalArchive && (
        <Notice tone="info" icon={<RiArchiveStackFill size={24} />} title="Archive entry">
          This is an archive entry for informational and preservation purposes only. No patch file is available for download.
        </Notice>
      )}

      {editor && (
        <div className="mt-5">
          <DraftStatusStrip slug={hack.slug} stage={editor.stage} submittedAt={hack.submitted_at} required={editor.checklist.required} contact={hack.verification_contact_info} preview={editor.preview} />
        </div>
      )}

      {editing && editor.notOwner && (
        <Notice tone="warn" icon={<FiAlertTriangle size={22} />} title="You are editing a hack you do not own.">
          Changes save as you type, so be careful with what you change.
        </Notice>
      )}

      {isDraft && !editor && (
        <Notice tone="info" icon={<FiInfo size={22} />} title="This is a private draft.">
          Only you can see this page. Finish the checklist on the{" "}
          <Link href={`/hack/${hack.slug}/edit`} className="text-link-hd">
            edit page
          </Link>{" "}
          and submit it for review when it is ready.
        </Notice>
      )}

      {!hack.approved && !isDraft && !editor && (
        <>
          {hasMissingPatch &&
            (isAdmin ? (
              <Notice tone="warn" icon={<FiAlertTriangle size={22} />} title="This hack is missing a patch file.">
                A patch file must be uploaded before this hack can be approved. Please try to ask the creator to upload a patch file.
              </Notice>
            ) : (
              <Notice tone="warn" icon={<FiAlertTriangle size={22} />} title="Your hack is missing a patch file.">
                You need to upload a patch file before an admin can approve your hack. Use the options menu to upload a patch file.
              </Notice>
            ))}
          {hasMissingScreenshots &&
            (isAdmin ? (
              <Notice tone="warn" icon={<FiAlertTriangle size={22} />} title="This hack is missing screenshots.">
                Screenshots should be uploaded before this hack can be approved. Please try to ask the creator to add screenshots.
              </Notice>
            ) : (
              <Notice tone="warn" icon={<FiAlertTriangle size={22} />} title="Your hack is missing screenshots.">
                You should add screenshots before an admin can approve your hack. Use the options menu to add screenshots.
              </Notice>
            ))}
          {!hasMissingPatch &&
            !hasMissingScreenshots &&
            (isAdmin ? (
              <Notice tone="warn" icon={<FiAlertTriangle size={22} />} title="You are viewing this unpublished hack as an admin.">
                This hack is pending approval. Please review the contents of this hack before making a decision. Then choose Approve from the dropdown options.
              </Notice>
            ) : (
              <Notice tone="warn" icon={<FiAlertTriangle size={22} />} title="Your hack is pending approval.">
                Your hack is currently under review and will be visible to all users once approved by an admin.
              </Notice>
            ))}
          {isAdmin && hack.verification_contact_info && (
            <Notice tone="info" icon={<FiInfo size={22} />} title="Verification contact information">
              <span className="whitespace-pre-line">{hack.verification_contact_info}</span>
            </Notice>
          )}
        </>
      )}

      <header className="flex flex-col gap-4 pb-6 pt-5 md:flex-row md:items-start md:justify-between md:pb-7 md:pt-8">
        <div className={`min-w-0 max-w-[820px] ${editing ? "flex-1" : ""}`}>
          {!editing && <h1 className="font-display text-[28px] leading-[1.1] text-balance md:text-[clamp(32px,3.4vw,40px)]">{hack.title}</h1>}
          {editing && (
            <DraftHeader title={hack.title} summary={hack.summary} tags={tags} catalogTags={editor.catalogTags} tagsUpdatedAt={editor.tagsUpdatedAt}>
              {byline}
            </DraftHeader>
          )}
          {!editing && byline}
          {!editing && (
            <>
              <p className="mt-3 max-w-[70ch] text-[14px] text-text-2 md:text-[15px]">{hack.summary}</p>
              <CollapsibleTags tags={tags} />
            </>
          )}
        </div>
        {/* Admins editing someone else's hack keep the menu so Approve stays in reach. */}
        {(!editing || editor.notOwner) && (
          <div className="flex flex-none items-center gap-2 md:pt-2">
          <HackShareButton title={hack.title} url={pageUrl} author={hack.original_author || profile?.username || null} />
          <HackOptionsMenu slug={hack.slug} canEdit={canEdit} canUploadPatch={canUploadPatch} editHref={isArchive ? `/hack/${hack.slug}/edit` : `/hack/${hack.slug}?edit=1`}>
            {isAdmin && !hack.approved && (
              <MenuItem as="a" href={`/hack/${hack.slug}/approve`} className="block w-full px-3 py-2 text-left text-sm font-medium text-ready data-focus:bg-surface-2">
                <FaCircleCheck className="mb-0.5 mr-2 inline-block align-middle" size={12} />
                Approve
              </MenuItem>
            )}
            {isAdmin && profile?.email && (
              <MenuItem as="a" href={`mailto:${profile.email}`} className="block w-full px-3 py-2 text-left text-sm font-medium text-text-2 data-focus:bg-surface-2">
                <FiMail className="mb-0.5 mr-2 inline-block align-middle" size={12} />
                Contact creator
              </MenuItem>
            )}
            {isAdmin && !isArchive && !hasReviewThread && <CreateReviewThreadMenuItem slug={hack.slug} />}
          </HackOptionsMenu>
          </div>
        )}
      </header>

      {/* Wraps the whole body so the review card can open the details sheet too. */}
      <RailEditor editing={editing} values={{ base_rom: hack.base_rom, language: hack.language ?? "English", completion_status: hack.completion_status, box_art: hack.box_art, social_links: social, original_author: hack.original_author, permission_from: hack.permission_from, ...(hack.approved ? {} : { verification_contact_info: hack.verification_contact_info }) }} baseLocked={patchId !== null}>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_300px] md:grid-rows-[auto_1fr] md:[grid-template-areas:'main_patch'_'main_rail']">
        <div className="order-1 md:order-none md:[grid-area:patch]">
          {editing ? (
            <DraftChecklist slug={hack.slug} stage={editor.stage} required={editor.checklist.required} recommended={editor.checklist.recommended} contact={hack.verification_contact_info} />
          ) : showPatchModule ? (
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
          ) : (
            <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
              <div className="rounded-control bg-surface-2 px-3.5 py-3 text-sm">
                {isInformationalArchive ? (
                  <p>
                    <b className="font-semibold">No patch available.</b> This entry is preserved for reference only.
                  </p>
                ) : (
                  <p>
                    <b className="font-semibold">No patch yet.</b> Once a version is uploaded, players get the patch button here.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="order-2 min-w-0 md:order-none md:[grid-area:main]">
          <HackTabs
            slug={hack.slug}
            title={hack.title}
            author={author}
            images={images}
            about={<Markdown headingLevelOffset={1}>{hack.description}</Markdown>}
            aboutPanel={editing ? <DraftAbout description={hack.description} /> : undefined}
            changes={changes}
            versions={versionRows}
            baseRomName={baseRom ? baseGameLabel(baseRom.name) : null}
            gallery={editing ? <DraftGallery covers={editor.coverKeys.map((key, i) => ({ key, url: images[i] }))} platform={baseRom?.platform} /> : undefined}
            versionsAction={
              editing ? (
                <Link href={uploadHref} className="inline-flex h-10 w-fit items-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-sm font-medium transition-colors hover:border-text-3">
                  <FiUpload className="h-4 w-4 text-text-3" /> {versionRows.length === 0 ? "Upload the patch" : "Upload a new version"}
                </Link>
              ) : undefined
            }
          />
        </div>

        <aside className="order-3 flex flex-col md:order-none md:[grid-area:rail]">
          <RailGroup title="Compatibility" action={editing && <EditDetailsLink />}>
            <Facts
              rows={[
                ["Base ROM", baseRom ? <span className="plat-dot" data-platform={baseRom.platform}>{baseRom.name}</span> : "Unknown"],
                ["Platform", baseRom ? PLATFORM_NAMES[baseRom.platform] : "Unknown"],
              ]}
            />
          </RailGroup>

          {!isInformationalArchive && (
            <RailGroup title="How to play">
              <p className="mb-2.5 text-[13px] leading-[1.45] text-text-2">
                Load the patched ROM in {baseRom ? `a ${baseRom.platform} emulator` : "an emulator"}, or on real hardware with a flash cart. Creators recommend:
              </p>
              <Facts
                rows={(baseRom ? EMULATORS[baseRom.platform] : EMULATORS.GBA).map(({ os, picks }) => [
                  os,
                  <span key={os} className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {picks.map((pick) => (
                      <a key={pick.name} href={pick.url} target="_blank" rel="noreferrer" className="text-link-hd">
                        {pick.name}
                      </a>
                    ))}
                  </span>,
                ])}
              />
              <Link href="/faq#recommended-emulators" className="text-link-hd mt-2.5 inline-block text-[13px]">
                More about emulators
              </Link>
            </RailGroup>
          )}

          {(hack.box_art || editing) && (
            <RailGroup title="Box art" action={editing && <EditDetailsLink />}>
              {!hack.box_art && <p className="text-sm text-text-3">None yet.</p>}
              {hack.box_art && (<>
              <a href={hack.box_art} download target="_blank" rel="noreferrer" className="mb-2 block w-[min(100%,200px)] overflow-hidden rounded-frame border border-line shadow-rest transition-shadow hover:shadow-lift">
                <Image src={hack.box_art} alt={`${hack.title} box art`} width={200} height={200} className="h-auto w-full" unoptimized />
              </a>
              <a href={hack.box_art} download target="_blank" rel="noreferrer" className="text-link-hd text-sm">
                Download
              </a>
              </>)}
            </RailGroup>
          )}

          <RailGroup title="Details" action={editing && <EditDetailsLink />}>
            <Facts
              rows={[
                ...(!isArchive ? [["Downloads", <DownloadsBadge key="dl" slug={hack.slug} initialCount={downloads ?? 0} />] as const] : []),
                ...(lastUpdated ? [["Updated", lastUpdated] as const] : []),
                ["First uploaded", new Date(hack.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })],
                ["Language", hack.language || "Unknown"],
              ]}
            />
          </RailGroup>

          {((social && (social.discord || social.twitter || social.pokecommunity || social.github)) || editing) && (
            <RailGroup title="Links" action={editing && <EditDetailsLink />}>
              {!(social && (social.discord || social.twitter || social.pokecommunity || social.github)) && <p className="text-sm text-text-3">None yet.</p>}
              <ul className="flex flex-col gap-1.5 text-sm">
                {social?.discord && <SocialLink href={social.discord} icon={<FaDiscord size={16} />} label="Discord" />}
                {social?.twitter && <SocialLink href={social.twitter} icon={<FaTwitter size={16} />} label="Twitter" />}
                {social?.pokecommunity && <SocialLink href={social.pokecommunity} icon={<PokeCommunityIcon width={16} height={16} color="currentColor" />} label="PokéCommunity" />}
                {social?.github && <SocialLink href={social.github} icon={<FaGithub size={16} />} label="GitHub" />}
              </ul>
            </RailGroup>
          )}

          {otherHacks.length > 0 && (
            <RailGroup title={<>More from <Handle name={author} /></>}>
              <ul className="flex flex-col gap-3 text-sm">
                {otherHacks.map((otherHack) => (
                  <li key={otherHack.slug}>
                    <Link href={`/hack/${otherHack.slug}`} prefetch={false} className="group/more block">
                      <span className="font-medium underline-offset-[3px] group-hover/more:underline">{otherHack.title}</span>
                      {otherHack.summary && <p className="mt-0.5 line-clamp-2 text-[13px] text-text-3">{otherHack.summary}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            </RailGroup>
          )}

          <RailGroup title={isInformationalArchive ? "About this entry" : "About this patch"}>
            <div className="flex flex-col gap-2 text-[13px] leading-[1.45] text-text-3">
              {isInformationalArchive ? (
                <>
                  <p>
                    This is an archive entry for <span className="font-semibold text-text-2">{hack.title}</span> preserved for informational purposes.
                    {hack.original_author && (
                      <>
                        {" "}The original author of this hack is <span className="font-semibold text-text-2">{hack.original_author}</span>.
                      </>
                    )}
                  </p>
                  <p>Archive entries do not include patch files and are maintained for historical reference and preservation purposes only.</p>
                </>
              ) : (
                <>
                  <p>
                    This page provides {isDownloadableArchive ? "an archived" : "the official"} patch file for{" "}
                    <span className="font-semibold text-text-2">{hack.title}</span>
                    {isDownloadableArchive ? " with permission from the original creator" : ""}. You can safely download the patched ROM for this hack using our built-in patcher.
                  </p>
                  <p>
                    By pressing &quot;Agree and patch&quot;, your browser will download and apply the <span className="font-semibold text-text-2">{hack.title}</span> patch file to your legally-obtained{" "}
                    <span className="font-semibold text-text-2">{baseRom?.name}</span> ROM. The patched ROM will then be automatically downloaded.
                  </p>
                  <p>No pre-patched ROMs or base ROMs are hosted or distributed on this site. All patching is done locally on your device.</p>
                </>
              )}
            </div>
          </RailGroup>
        </aside>
      </div>
      </RailEditor>
    </div>
  );

  return editing ? <DraftEditingProvider slug={hack.slug} live={!hack.approved}>{page}</DraftEditingProvider> : page;
}

/** In edit mode the rail is wrapped by the details sheet so group headings can open it. */
function RailEditor({ editing, values, baseLocked, children }: { editing: boolean; values: React.ComponentProps<typeof DraftDetails>["values"]; baseLocked: boolean; children: React.ReactNode }) {
  if (!editing) return <>{children}</>;
  return (
    <DraftDetails values={values} baseLocked={baseLocked}>
      {children}
    </DraftDetails>
  );
}

function RailGroup({ title, action, children }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-1 pt-[18px] first:border-t-0 first:pt-0 [&+&]:mt-[18px]">
      <h2 className="mb-2.5 flex items-baseline justify-between text-[13px] font-semibold tracking-[.01em] text-text-3">
        {title}
        {action}
      </h2>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: ReadonlyArray<readonly [string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-sm leading-[1.35]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-text-3">{label}</dt>
          <dd className="min-w-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline hover:underline-offset-[3px]">
        <span className="text-text-3">{icon}</span>
        {label}
        <FiArrowUpRight className="h-3.5 w-3.5 text-text-3" />
      </a>
    </li>
  );
}

function Notice({ tone, icon, title, children }: { tone: "warn" | "info"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className={`mt-5 flex items-start gap-3.5 rounded-card border px-4 py-3.5 ${tone === "warn" ? "border-warn/40 bg-warn-soft" : "border-line-strong bg-surface-2"}`}>
      <span className={`mt-0.5 flex-none ${tone === "warn" ? "text-warn" : "text-text-2"}`}>{icon}</span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-text-2">{children}</p>
      </div>
    </div>
  );
}
