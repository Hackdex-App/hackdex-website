- Looking to play a romhack? *See [Players](#players)*.
- Interested in submitting a romhack? *See [Creators](#creators)*.

---

## Players

### What is Hackdex?
Hackdex is a hosting platform for creators to share their Pokémon romhacks and for players to discover and play them. It hosts patches and lets you apply them to your own base ROM in your browser.

Hackdex does not handpick hacks based on staff taste or recommendations. Submissions are subject to approval and content rules, but hosting a hack does not mean we endorse its views or guarantee its quality.

### Do I need my own ROM file?
Yes. Hackdex distributes patches, not complete, pre-patched ROM files. You must provide your own legally obtained base ROM of the original Pokémon game. You'll link your base ROM once, then easily apply patches directly in your browser.

### Is using Hackdex legal?
Unlike some other ROM sharing sites, Hackdex focuses on legal distribution by hosting and sharing patches rather than complete ROMs. You're responsible for obtaining your base ROMs legally. While it might *feel* like you're downloading a ROM, your browser is actually applying the patch to your rom behind the scenes.

### How do I play a ROM hack from Hackdex?
Browse the Discover page to find a ROM hack that interests you. Once you've selected a hack, you'll use Hackdex's built-in patching system to apply the patch to your legally obtained base ROM. The patching happens client-side in your browser, so you can start playing without needing any external patching tools. Below are some [recommended emulators](#recommended-emulators) for different platforms.

### Do I need an account to browse and download patches?
No account is required to browse the Discover page and download ROM hacks.

### Why do I keep getting a _"Failed to fetch"_ error when trying to download a hack? {#failed-to-fetch-error}
Some users have reported issues with their Internet Service Provider (ISP) blocking the download. Check with your ISP to see if they are blocking the `patches.hackdex.app` or `images.hackdex.app` domains. If so, contact them to see if they can unblock the domains. Until then, try using your phone's data connection instead of Wi-Fi, or use a VPN to bypass the block. This will likely continue to be an issue until Hackdex increases in age and popularity.

If the problem is not related to your ISP, try clearing your browser's cache and reloading the page or using a different browser or device. If the error persists, please contact us.

### How do I find ROM hacks that interest me?
Use the [Discover page](/discover) to search for hacks or filter by tags, base ROM, and more. Listings are ordered automatically using the sorting option you choose:

- "Trending" uses downloads from the past three days along with total downloads.
- "Most popular" uses total downloads.
- "Newest" uses the date a hack was approved.
- "Recently updated" uses the publication date of the hack's current patch.
- "Alphabetical" sorts by title.

Download activity is the only input to popularity and trending rankings. Placement does not represent a staff recommendation.

### Does Hackdex allow AI-generated content?
Yes, with disclosure. Creators must disclose AI use in both content and code through Hackdex's AI disclosure form. Their disclosure appears on the hack's page to help you decide whether you want to play it. On Discover, you can filter to hacks with no AI content or no direct AI usage.

We believe a blanket ban can encourage creators to hide AI use. Requiring disclosure gives creators room to be honest and helps players make an informed choice. Disclosed content must still follow our credits and content rules. See [what creators need to disclose](#ai-disclosure) for details.

### How do I report a hack or page that breaks the rules?
There is a Report option on each hack page. Or you can use the [contact form](/contact). Include the hack's page URL and enough detail for us to locate the issue. For content inside a hack, include the version and where it appears in the game. See our [content guidelines](#content-guidelines) for a summary of what is prohibited.

### What types of ROM hacks are available?
Hackdex is specifically focused on Pokémon ROM hack patches across different generations of Pokémon games. Creators must submit and upload their own ROM hacks. We do not steal the work of other creators without their explicit permission.

### How does Hackdex make money?
*We don't.*

Hackdex is a labor of love for the Pokémon community. That means no ads or paid features. Romhack development can already be considered a gray area, so we don't want to compound any risks through monetization.

The code is [fully open source](https://github.com/Hackdex-App/hackdex-website), so if you really want to support the project, feel free to contribute!

### Recommended emulators

These emulators are considered to be the most accurate to the original hardware and are recommended by most creators for the best experience.

#### GB, GBC
| Platform | Emulator |
|----------|---------|
| Windows, macOS, Linux | [SameBoy](https://sameboy.github.io/) |
| Android | [RetroArch w/ SameBoy core](https://play.google.com/store/apps/details?id=com.retroarch) |
| iOS | [SameBoy](https://apps.apple.com/us/app/sameboy/id6496971295) |

#### GBA
| Platform | Emulator |
|----------|---------|
| Windows, macOS, Linux | [mGBA](https://mgba.io/) |
| Android | [Pizza Boy](https://play.google.com/store/apps/details?id=com.dothq.pizzaboy) \| [Lemuroid](https://play.google.com/store/apps/details?id=com.swordfish.lemuroid) \| [RetroArch w/ mGBA core](https://play.google.com/store/apps/details?id=com.retroarch) |
| iOS | [RetroArch w/ mGBA core](https://apps.apple.com/us/app/retroarch/id6499539433) \| [Manic EMU w/ mGBA core](https://apps.apple.com/us/app/manic-emu-game-emulator/id6743335790) |

#### NDS
| Platform | Emulator |
|----------|---------|
| Windows, macOS, Linux | [MelonDS](https://melonds.kuribo64.net/) |
| Android | [RetroArch w/ MelonDS core](https://play.google.com/store/apps/details?id=com.retroarch) |
| iOS | [Delta](https://apps.apple.com/us/app/delta-game-emulator/id1048524688) \| [RetroArch w/ MelonDS core](https://apps.apple.com/us/app/retroarch/id6499539433) \| [Manic EMU w/ MelonDS core](https://apps.apple.com/us/app/manic-emu-game-emulator/id6743335790) |

---

## Creators

### How do I submit my romhack to Hackdex?
Navigate to the Submit page on Hackdex. You'll need to create an account before you can submit your hack. The submission process is designed to be straightforward while ensuring proper attribution to creators.

### Can I submit a hack that I didn't create? {#submit-not-own-hack}
No. Hackdex is a platform for creators to share their own hacks. If you did not create the hack, you should reach out to the original creator to see if they are interested in submitting it themselves.

Only the original creator or a member of their team can submit the hack to Hackdex. We will do our due diligence to contact the creators to verify any submissions before approval.

### Why do I need an account to submit?
Account creation is required for submissions to preserve author control and attribution. This ensures your work is properly credited and you maintain control over your hack's listing. This also allows you to update your hack after submission.

### What format should I submit my hack in?
We recommend providing your modified ROM in the submission form. Hackdex uses your selected base ROM to generate an `.xdelta` patch on your device, and no ROMs are uploaded. Users receive the generated patch, not a complete ROM.

If you already have a `.bps` or `.xdelta` patch file, you can upload it as a fallback. Hackdex cannot always guarantee that an uploaded patch is compatible with the chosen base ROM, so auto-generating from your modified ROM is recommended.

### Why only BPS and Xdelta patch files?
Both formats support checksum verification so the patch is linked to the correct base ROM. An incorrect base ROM will result in a corrupted game. BPS remains supported for existing hacks; new in-browser patch creation produces Xdelta files, which is the preferred format going forward.

### How does my hack gain visibility?
We highly recommend linking to your romhack's Hackdex page from PokéCommunity, Reddit, or other social media platforms. Doing so can help boost your hack's visibility and outrank those sketchy ROM sharing sites that steal many creators' hard work.

Once approved, your hack can appear on Discover. "Newest" sorts by approval date, and "Recently updated" sorts by the publication date of your current patch. "Most popular" and "Trending" use download activity. These listings are ordered automatically and do not reflect staff preferences.

Here are some helpful tips for improving your hack's page to help increase visibility:
- Include at least 3 screenshots that help make your hack stand out, with the first one being the most eye-catching.
- Ensure your screenshots are taken using the emulator's built-in screenshot functionality (not your computer's screenshot/snipping tools!).
  - GIF screenshots are supported!
- Use [Markdown formatting](https://github.com/adam-p/markdown-here/wiki/markdown-cheatsheet) for your description to make it more readable and visually appealing.

### Can I update my romhack after submitting?
Yes. When you publish a new current patch, its publication date determines your hack's position when players sort Discover by "Recently updated". Editing your description alone does not move your hack up that list. Keep your credits and any AI disclosure accurate when you update your hack or page.

### Do I need to include credits? {#credits}
Yes. Every hack must have a clearly labeled Credits section in its Hackdex description. List the hack's contributors and the creators or sources of reused assets and code, or link to a complete, publicly accessible credits page. Credits available only inside the game are not enough.

Keep your credits up to date and follow any attribution requirements for material you use. Giving credit does not replace permission to use someone else's work. This requirement is part of [Section 6 of the Terms of Service](/terms#6-creator-responsibilities).

### What AI use do I need to disclose? {#ai-disclosure}
Complete Hackdex's AI disclosure form for each hack, even if you have no AI use to declare. Follow the guidance in the form to describe the extent of AI use, and keep your answers up to date. You do not need an AI disclosure section in your description, but a description note does not replace the form.

Disclose content and code generated or modified with AI that is included in your hack or its Hackdex page. This includes graphics, music, writing, translations, event scripts, and general programming, even a single bug fix. Count work you edited afterward or received from contributors.

Disclosure of AI use for brainstorming and unused experiments is optional when no AI-generated or AI-modified content or code is included in the hack or its page. Disclosure does not replace credits or exempt your hack from our content rules. See [Section 6 of the Terms of Service](/terms#6-creator-responsibilities) for the full requirement.

The form asks for a level in six areas. Graphics, music and sound, story and dialogue, translation, and event scripts use three levels. Code uses five, since a single AI bug fix and an AI-written engine are very different.

| Level | Content areas | Code |
| --- | --- | --- |
| None | No AI | No AI |
| A little | Not used | A bug fix or a few |
| Some | Anything from one asset up to a sizable share, like a title screen or a few tracks | AI helped write some larger features |
| Most | Most or all of it | AI wrote most of the code, and the creator reviewed it |
| All | Not used | The creator told the AI what to do |

The label's headline sums it up: **Contains AI** when any content area has AI, **AI in code only** when only code does, and **No direct AI usage** when nothing AI-generated was intentionally added. Brainstorming, unused experiments, and anything that came with a base the creator built on don't count.

### Who retains ownership of submitted hacks?
Creators retain ownership of their work. Hackdex serves as a distribution and discovery platform. Specific rights and responsibilities are outlined in the Terms of Service available on the platform.

### Are there content guidelines for submissions? {#content-guidelines}
Yes. Submit Pokémon ROM hack patches that you have the right to share, include credits, and disclose AI use through the dedicated form as described above. Hacks are subject to approval before they become public, and must continue to follow the rules after approval.

We prohibit targeted harassment, threats, derogatory attacks against real people or groups, hate speech, and discriminatory abuse. This includes dehumanizing people or promoting hatred, discrimination, or violence based on characteristics such as race, ethnicity, nationality, religion, disability, sex, sexual orientation, or gender identity. These rules cover content inside the hack as well as its title, description, screenshots, cover images, and other page material.

We consider narrative context. A story depicting conflict or prejudice does not automatically promote it, but calling something fiction, humor, or satire does not excuse targeted harassment, discriminatory abuse, or the promotion of hatred or violence.

Hacks or hack pages found to contain prohibited content will be removed. Responsible accounts may also be suspended or banned. For missing or incomplete credits or AI disclosures, we may request corrections, refuse publication, or remove the listing until it complies. Deliberate misrepresentation or repeated violations may also lead to suspension or a ban.

The full restrictions, including rules against ROM sharing, infringement, malware, and sharing personal data without permission, are in [Section 8 of the Terms of Service](/terms#8-prohibited-content-and-conduct). To report a suspected violation, use the [contact form](/contact) or the hack page's Report option.
