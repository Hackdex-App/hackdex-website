import { getHackMetadata } from "@/app/hack/[slug]/actions";
import { baseRoms } from "@/data/baseRoms";
import { isArchiveHack } from "@/utils/hack";
import type { Metadata } from "next";

export interface HackDetailPageProps {
  params: Promise<{ slug: string }>;
}

export function getHackPageUrl(slug: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return siteUrl ? `${siteUrl}/hack/${slug}` : `/hack/${slug}`;
}

export async function getHackPageMetadata(
  slug: string,
  includeRestricted: boolean,
): Promise<Metadata> {
  const metadata = await getHackMetadata(slug);
  if (
    !metadata ||
    (!includeRestricted &&
      (!metadata.hack.approved || isArchiveHack(metadata.hack)))
  ) {
    return { title: "Hack not found" };
  }

  const { hack, profile } = metadata;
  const author = hack.original_author
    ? hack.original_author
    : profile?.username
      ? `@${profile.username}`
      : undefined;

  if (!hack.approved) {
    return {
      title: hack.title,
      description: "This hack is pending approval by an admin.",
    };
  }

  const isArchive = isArchiveHack(hack);
  const baseRomName =
    baseRoms.find((rom) => rom.id === hack.base_rom)?.name ?? "Pokémon";
  const pageUrl = getHackPageUrl(slug);
  const title = isArchive
    ? `${hack.title} | Archive`
    : `${hack.title} | ROM hack download`;
  const description = isArchive
    ? `Archive entry for ${hack.title}, a fan-made ROM hack for ${baseRomName}. ${hack.summary}`
    : `Play ${hack.title}, a fan-made ROM hack for ${baseRomName}. ${hack.summary}`;

  return {
    title,
    description,
    keywords: [
      hack.title,
      `${hack.title} rom hack`,
      `${hack.title} patch`,
      `${hack.title} patcher`,
      `${hack.title} patched rom`,
      `${hack.title} rom download`,
      `${hack.title} download patch`,
      baseRomName,
      "Pokemon rom hack",
      "Pokemon patch file",
      `${baseRomName} rom hack`,
      `${baseRomName} patch file`,
    ],
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      authors: author ? [author] : undefined,
      type: "article",
      publishedTime: new Date(hack.created_at).toISOString(),
      modifiedTime: hack.updated_at
        ? new Date(hack.updated_at).toISOString()
        : undefined,
      images: hack.box_art
        ? [
            {
              url: hack.box_art,
              alt: `${hack.title} ROM hack box art`,
            },
          ]
        : undefined,
    },
  };
}
