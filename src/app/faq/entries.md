- Looking to play a romhack? *See [Players](#players)*.
- Interested in submitting a romhack? *See [Creators](#creators)*.

---

## Players

### What is Hackdex?
Hackdex is a community hub for discovering and playing Pokémon romhacks. The platform centralizes romhack discovery and provides an in-browser patching system to make playing hacks straightforward and accessible.

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
The Discover page features curated sections including "Trending", "Most Popular," "Newest," and "Recently Updated" to help you find active and trending hacks quickly. You can also search or filter by tags, base ROM, and more.

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
We only accept BPS patch files, not complete ROMs. Hackdex utilizes a built-in patcher that users apply to their own legally obtained base ROMs. This helps keep the platform safer from potential legal issues.

A built-in patcher is also included in the submission form, so you also have the option to provide your modified ROM and the base ROM to generate the patch file automatically.

### Why only BPS patch files?
The BPS format is the successor to the IPS and UPS formats, with the added benefit of including hash checksums for verification. This helps ensure that the patch file is linked to the correct base ROM. An incorrect base ROM will result in a corrupted game.

There are also plans to add Xdelta support for NDS hacks in the future.

### How does my hack gain visibility?
We highly recommend linking to your romhack's Hackdex page from PokéCommunity, Reddit, or other social media platforms. Doing so can help boost your hack's visibility and outrank those sketchy ROM sharing sites that steal many creators' hard work.

Once submitted on Hackdex, your hack can appear in the Discover page's curated sections, including "Newest" hacks for recent submissions and "Recently Updated" when you post updates. Popular hacks gain visibility in the "Most Popular" section based on number of downloads.

Here are some helpful tips for improving your hack's page to help increase visibility:
- Include at least 3 screenshots that help make your hack stand out, with the first one being the most eye-catching.
- Ensure your screenshots are taken using the emulator's built-in screenshot functionality (not your computer's screenshot/snipping tools!).
  - GIF screenshots are supported!
- Use [Markdown formatting](https://github.com/adam-p/markdown-here/wiki/markdown-cheatsheet) for your description to make it more readable and visually appealing.

### Can I update my romhack after submitting?
Yes. Hackdex supports updates to submitted hacks, which will be reflected in the "Recently Updated" section of the Discover page, giving your hack renewed visibility.

### Who retains ownership of submitted hacks?
Creators retain ownership of their work. Hackdex serves as a distribution and discovery platform. Specific rights and responsibilities are outlined in the Terms of Service available on the platform.

### Are there content guidelines for submissions?
As a platform focused on Pokémon ROM hack patches, your submission should be a patch file for a Pokémon game. Detailed guidelines and restrictions are available in the Hackdex Terms of Service and on the Submit page. Your hack will be subject to approval before it can be viewed publicly.
