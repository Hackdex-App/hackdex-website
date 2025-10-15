export type BaseRom = {
  id: string;
  name: string;
  platform: "GB" | "GBC" | "GBA" | "NDS";
  region: string;
  sha1?: string;
};

export const baseRoms: BaseRom[] = [
  // GBA
  { id: "poke_emerald", name: "Pokemon Emerald", platform: "GBA", region: "USA, Europe", sha1: "f3ae088181bf583e55daf962a92bb46f4f1d07b7" },
  { id: "poke_firered", name: "Pokemon FireRed (v1.0)", platform: "GBA", region: "USA, Europe", sha1: "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc" },
  { id: "poke_firered_rev1", name: "Pokemon FireRed (Rev 1)", platform: "GBA", region: "USA, Europe", sha1: "dd5945db9b930750cb39d00c84da8571feebf417" },
  { id: "poke_leafgreen", name: "Pokemon LeafGreen", platform: "GBA", region: "USA, Europe" },
  { id: "poke_ruby", name: "Pokemon Ruby", platform: "GBA", region: "USA, Europe" },
  { id: "poke_sapphire", name: "Pokemon Sapphire", platform: "GBA", region: "USA, Europe" },

  // GBC
  { id: "poke_crystal", name: "Pokemon Crystal", platform: "GBC", region: "USA, Europe" },

  // NDS
  { id: "poke_platinum", name: "Pokemon Platinum", platform: "NDS", region: "USA", sha1: "0862EC35B24DE5C7E2DCB88C9EEA0873110D755C" },
  { id: "poke_heartgold", name: "Pokemon HeartGold", platform: "NDS", region: "USA", sha1: "4FCDED0E2713DC03929845DE631D0932EA2B5A37" },
  { id: "poke_diamond", name: "Pokemon Diamond", platform: "NDS", region: "USA" },
  { id: "poke_pearl", name: "Pokemon Pearl", platform: "NDS", region: "USA" },
  { id: "poke_soulsilver", name: "Pokemon SoulSilver", platform: "NDS", region: "USA" },
  { id: "poke_black_version", name: "Pokemon Black Version", platform: "NDS", region: "USA" },
  { id: "poke_white_version", name: "Pokemon White Version", platform: "NDS", region: "USA" },
  { id: "poke_black_version_2", name: "Pokemon Black Version 2", platform: "NDS", region: "USA" },
  { id: "poke_white_version_2", name: "Pokemon White Version 2", platform: "NDS", region: "USA" },
];


