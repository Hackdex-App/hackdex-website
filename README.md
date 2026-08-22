# Hackdex

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-DB%20%2F%20Auth%20%2F%20Storage-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![S3 Compatible](https://img.shields.io/badge/Patch_Storage-S3-orange?logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

> **Disclaimer**: A good chunk of this code was initially written with AI assistance using Cursor. I later pledged to not use AI in future contributions, but due to life circumstances causing my time to be incredibly limited now, I made the difficult decision to resume using AI assistance in order to prevent Hackdex from going dormant and becoming neglected.

## What is Hackdex?

Hackdex is a community hub for discovering and sharing Pokémon romhack patches. Players link their own legally obtained base roms once, then easily patch locally in the browser and download the patched rom. Hackdex only stores patches, screenshots, and metadata—never any roms—so distribution stays practical without any of the legal pitfalls. Creators get a consistent place to publish, version, and present their projects.

## Core features

- **Discover**: curated hacks with screenshots, tags, versions, and summaries
- **Submit**: metadata, screenshots, social links, and a `.bps` or `.xdelta` patch file
- **Patch in the browser**: BPS via [RomPatcher.js](https://github.com/marcrobledo/RomPatcher.js); xdelta (VCDIFF) via a WASM build of [xdelta3](https://github.com/jmacd/xdelta) with glue from the Hackdex fork of [xdelta-wasm](https://github.com/Hackdex-App/xdelta-wasm) (forked from [kotcrab/xdelta-wasm](https://github.com/kotcrab/xdelta-wasm); statically linked [XZ Utils](https://tukaani.org/xz/) liblzma); linked base roms stay on the user's device
- **Safe delivery**: public urls for cover images, short-lived signed URLs for patch downloads and other assets; no rom storage required

## Tech stack

- Next.js 15 (App Router), TypeScript, React 19, Tailwind CSS 4
- Supabase (Postgres, Auth, Storage) for data, auth, and cover images
- S3-compatible object storage (Minio locally or preferred provider) for patch files (`patches` bucket)
- In-browser patching with RomPatcher.js and xdelta3 WASM; local persistence with IndexedDB and the File System Access API

## High-level architecture

- UI: Next.js App Router with a mix of server and client components
- Data: Supabase tables for hacks, tags, patches; cover images stored in `covers` S3-compatible bucket
- Patches: stored in an S3-compatible bucket `patches`; downloads use short-lived signed URLs via an API route
- Auth: Supabase SSR helpers manage cookies; client SDK for browser calls

## Contribution guidelines

- PRs welcome. Keep changes small, typed, and accessible
- Prefer clear naming, early returns, and avoid `any`
- Match existing Tailwind and component patterns

## Security & legal notes

- **Hackdex _does not host roms_ and never will; users supply them locally during patching**
- Patching happens entirely in the browser against the user's local file

---

## Local development setup

Set up local Supabase for database, auth, and storage, and an S3-compatible bucket for patch files.

### Prerequisites

- Node.js 20+
- Docker and the Supabase CLI
- An S3-compatible service (Minio locally, or a cloud provider like AWS S3 or Cloudflare R2)

### Environment variables (`.env.local`)

Provide your Supabase project URL, publishable key, public site urls, and S3 connection details:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SITE_DOMAIN=

NEXT_PUBLIC_HACK_COVERS_DOMAIN=

S3_ENDPOINT=
S3_PORT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_USE_SSL=

DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
DISCORD_GUILD_ID=
DISCORD_BOT_TOKEN=
DISCORD_REVIEW_FORUM_CHANNEL_ID=
DISCORD_FORUM_TAG_PENDING_ID=
DISCORD_FORUM_TAG_APPROVED_ID=

RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
RESEND_INBOUND_DOMAIN=
RESEND_FROM=
```

### Supabase (local)

Follow the official guide to run Supabase locally with the CLI (includes Studio):

- Supabase CLI getting started: [Local development with the Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform&platform=macos&queryGroups=access-method&access-method=studio)

Typical flow:

1) Initialize and start services using the CLI
2) Note the printed API URL and publishable key; set them in `.env.local` as shown above
3) Apply this repository’s migrations in `supabase/migrations`
4) Create a Supabase Storage bucket named `hack-covers` and make it public. Set the `NEXT_PUBLIC_HACK_COVERS_DOMAIN` environment variable to the public URL of your covers bucket (e.g., `https://your-project.supabase.co/storage/v1/object/public/hack-covers`)

### S3‑compatible storage for patches and covers

- Create a bucket named `patches` and a public bucket named `covers`
- Point the `S3_*` environment variables to your S3 endpoint (Minio locally or your vendor)
- Set the `COVERS_BUCKET` environment variable to the name of your covers bucket (e.g., `covers`)
- Set the `PATCHES_BUCKET` environment variable to the name of your patches bucket (e.g., `patches`)
- Set the `NEXT_PUBLIC_HACK_COVERS_DOMAIN` environment variable to the public URL of your covers bucket (e.g., `http://localhost:9000/covers`)

### Install & run

```
npm install
npm run dev
```

For easier debugging in VS Code, use the launch configurations in `.vscode/launch.json` (full stack, server-side, or client-side).

---

## License & Branding

- MIT licensed; see [LICENSE.md](LICENSE.md)
- Branding Notice: the name “Hackdex” is reserved for use by the original project; see `LICENSE.md`
