export const PLATFORMS = [
  "GB",
  "GBC",
  "GBA",
  "NDS",
] as const;
export type Platform = typeof PLATFORMS[number];

export const PLATFORM_NAMES: Record<Platform, string> = {
  GB: "Game Boy",
  GBC: "Game Boy Color",
  GBA: "Game Boy Advance",
  NDS: "Nintendo DS",
};

export type BaseRom = {
  id: string;
  name: string;
  platform: Platform;
  region: string;
  crc32: string;
  sha1: string;
  category?: string;
};

export const baseRoms: BaseRom[] = [
  // GBA
  { id: "poke_emerald",           name: "Pokémon Emerald",                                  platform: "GBA",  category: "Emerald",          region: "USA, Europe",      crc32: "1f1c08fb",  sha1: "f3ae088181bf583e55daf962a92bb46f4f1d07b7" },
  { id: "poke_firered",           name: "Pokémon FireRed (Rev 0)",                          platform: "GBA",  category: "FRLG",             region: "USA, Europe",      crc32: "dd88761c",  sha1: "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc" },
  { id: "poke_firered_rev1",      name: "Pokémon FireRed (Rev 1)",                          platform: "GBA",  category: "FRLG",             region: "USA, Europe",      crc32: "84ee4776",  sha1: "dd5945db9b930750cb39d00c84da8571feebf417" },
  { id: "poke_leafgreen",         name: "Pokémon LeafGreen (Rev 0)",                        platform: "GBA",  category: "FRLG",             region: "USA, Europe",      crc32: "d69c96cc",  sha1: "574fa542ffebb14be69902d1d36f1ec0a4afd71e" },
  { id: "poke_leafgreen_rev1",    name: "Pokémon LeafGreen (Rev 1)",                        platform: "GBA",  category: "FRLG",             region: "USA, Europe",      crc32: "daffecec",  sha1: "7862c67bdecbe21d1d69ce082ce34327e1c6ed5e" },
  { id: "poke_ruby",              name: "Pokémon Ruby (Rev 0)",                             platform: "GBA",  category: "Ruby/Sapphire",    region: "USA, Europe",      crc32: "f0815ee7",  sha1: "f28b6ffc97847e94a6c21a63cacf633ee5c8df1e" },
  { id: "poke_ruby_rev1",         name: "Pokémon Ruby (Rev 1)",                             platform: "GBA",  category: "Ruby/Sapphire",    region: "USA, Europe",      crc32: "61641576",  sha1: "610b96a9c9a7d03d2bafb655e7560ccff1a6d894" },
  { id: "poke_ruby_rev2",         name: "Pokémon Ruby (Rev 2)",                             platform: "GBA",  category: "Ruby/Sapphire",    region: "USA, Europe",      crc32: "aeac73e6",  sha1: "5b64eacf892920518db4ec664e62a086dd5f5bc8" },
  { id: "poke_sapphire",          name: "Pokémon Sapphire (Rev 0)",                         platform: "GBA",  category: "Ruby/Sapphire",    region: "USA, Europe",      crc32: "554dedc4",  sha1: "3ccbbd45f8553c36463f13b938e833f652b793e4" },
  { id: "poke_sapphire_rev1",     name: "Pokémon Sapphire (Rev 1)",                         platform: "GBA",  category: "Ruby/Sapphire",    region: "USA, Europe",      crc32: "bafedae5",  sha1: "4722efb8cd45772ca32555b98fd3b9719f8e60a9" },
  { id: "poke_sapphire_rev2",     name: "Pokémon Sapphire (Rev 2)",                         platform: "GBA",  category: "Ruby/Sapphire",    region: "USA, Europe",      crc32: "9cc4410e",  sha1: "89b45fb172e6b55d51fc0e61989775187f6fe63c" },
  { id: "poke_md_rrt",            name: "Pokémon Mystery Dungeon: Red Rescue Team",         platform: "GBA",  category: "Spin-off",         region: "USA, Australia",   crc32: "dd0ac86c",  sha1: "9f4cfc5b5f4859d17169a485462e977c7aac2b89" },
  { id: "poke_pinball_rs",        name: "Pokémon Pinball: Ruby & Sapphire",                 platform: "GBA",  category: "Spin-off",         region: "USA",              crc32: "b992a3c0",  sha1: "9fec81ce2c5df589e0371a0bf2f92a5fe8db730b" },

  // GBC
  { id: "poke_gold",              name: "Pokémon Gold",                                     platform: "GBC",  category: "GSC",              region: "USA, Europe",      crc32: "6bde3c3e",  sha1: "d8b8a3600a465308c9953dfa04f0081c05bdcb94" },
  { id: "poke_silver",            name: "Pokémon Silver",                                   platform: "GBC",  category: "GSC",              region: "USA, Europe",      crc32: "8ad48636",  sha1: "49b163f7e57702bc939d642a18f591de55d92dae" },
  { id: "poke_crystal",           name: "Pokémon Crystal (Rev 0)",                          platform: "GBC",  category: "GSC",              region: "USA",              crc32: "ee6f5188",  sha1: "f4cd194bdee0d04ca4eac29e09b8e4e9d818c133" },
  { id: "poke_crystal_rev1",      name: "Pokémon Crystal (Rev 1)",                          platform: "GBC",  category: "GSC",              region: "USA, Europe",      crc32: "3358e30a",  sha1: "f2f52230b536214ef7c9924f483392993e226cfb" },
  { id: "poke_tcg",               name: "Pokémon Trading Card Game",                        platform: "GBC",  category: "Spin-off",         region: "USA",              crc32: "81069d53",  sha1: "0f8670a583255cff3e5b7ca71b5d7454d928fc48" },

  // GB
  { id: "poke_red",               name: "Pokémon Red",                                      platform: "GB",   category: "RBY",              region: "USA, Europe",      crc32: "9f7fdd53",  sha1: "ea9bcae617fdf159b045185467ae58b2e4a48b9a" },
  { id: "poke_blue",              name: "Pokémon Blue",                                     platform: "GB",   category: "RBY",              region: "USA, Europe",      crc32: "d6da8a1a",  sha1: "d7037c83e1ae5b39bde3c30787637ba1d4c48ce2" },
  { id: "poke_yellow",            name: "Pokémon Yellow",                                   platform: "GB",   category: "RBY",              region: "USA, Europe",      crc32: "7d527d62",  sha1: "cc7d03262ebfaf2f06772c1a480c7d9d5f4a38e1" },

  // NDS
  { id: "poke_platinum_rev0",     name: "Pokémon Platinum (Rev 0)",                         platform: "NDS",  category: "DPPt",             region: "USA",              crc32: "9253921d",  sha1: "ce81046eda7d232513069519cb2085349896dec7" },
  { id: "poke_platinum",          name: "Pokémon Platinum (Rev 1)",                         platform: "NDS",  category: "DPPt",             region: "USA",              crc32: "69d628e8",  sha1: "0862EC35B24DE5C7E2DCB88C9EEA0873110D755C" },
  { id: "poke_diamond_rev5",      name: "Pokémon Diamond",                                  platform: "NDS",  category: "DPPt",             region: "USA",              crc32: "84427823",  sha1: "a46233d8b79a69ea87aa295a0efad5237d02841e" },
  { id: "poke_pearl_rev5",        name: "Pokémon Pearl",                                    platform: "NDS",  category: "DPPt",             region: "USA",              crc32: "e2d87ebf",  sha1: "99083bf15ec7c6b81b4ba241ee10abd9e80999ac" },
  { id: "poke_heartgold",         name: "Pokémon HeartGold",                                platform: "NDS",  category: "HGSS",             region: "USA",              crc32: "c180a0e9",  sha1: "4FCDED0E2713DC03929845DE631D0932EA2B5A37" },
  { id: "poke_soulsilver",        name: "Pokémon SoulSilver",                               platform: "NDS",  category: "HGSS",             region: "USA",              crc32: "d8ea6090",  sha1: "f8dc38ea20c17541a43b58c5e6d18c1732c7e582" },
  { id: "poke_black",             name: "Pokémon Black",                                    platform: "NDS",  category: "BW",               region: "USA, Europe",      crc32: "4f6e5580",  sha1: "26ad0b9967aa279c4a266ee69f52b9b2332399a5" },
  { id: "poke_white",             name: "Pokémon White",                                    platform: "NDS",  category: "BW",               region: "USA, Europe",      crc32: "b552501c",  sha1: "bc696a0dfb448c7b3a8a206f0f8214411a039208" },
  { id: "poke_black_2",           name: "Pokémon Black 2",                                  platform: "NDS",  category: "B2W2",             region: "USA, Europe",      crc32: "d4427fd1",  sha1: "e51e6dfb8678a3d19dcd2a10691b96a569ca0abb" },
  { id: "poke_white_2",           name: "Pokémon White 2",                                  platform: "NDS",  category: "B2W2",             region: "USA, Europe",      crc32: "777eb04f",  sha1: "b5d7490be7b415b8f1e672a53e978a9cc667e56a" },
  { id: "poke_md_eos",            name: "Pokémon Mystery Dungeon: Explorers of Sky",        platform: "NDS",  category: "Spin-off",         region: "USA",              crc32: "22dde080",  sha1: "5fa96ca8d8dd6405d6cd2bad73ed68bc73a9d152" },
  { id: "poke_conquest",          name: "Pokémon Conquest",                                 platform: "NDS",  category: "Spin-off",         region: "USA, Australia",   crc32: "a0166347",  sha1: "308e1609929dd78dbbff4f531a2cd17f873a3778" },
];


