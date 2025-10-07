export type BaseRom = {
  name: string;
  platform: "GB" | "GBC" | "GBA" | "NDS";
  region: string;
  sha1?: string;
};

export const baseRoms: BaseRom[] = [
  { name: "Pokemon FireRed", platform: "GBA", region: "USA, Europe", sha1: "41cb23d8dccc8ebd7c649cd8fbb58eeace6e2fdc" },
  { name: "Pokemon FireRed (Rev 1)", platform: "GBA", region: "USA, Europe", sha1: "dd5945db9b930750cb39d00c84da8571feebf417" },
  { name: "Pokemon LeafGreen", platform: "GBA", region: "USA, Europe" },
  { name: "Pokemon Ruby", platform: "GBA", region: "USA, Europe" },
  { name: "Pokemon Sapphire", platform: "GBA", region: "USA, Europe" },
  { name: "Pokemon Emerald", platform: "GBA", region: "USA, Europe", sha1: "f3ae088181bf583e55daf962a92bb46f4f1d07b7" },
  { name: "Pokemon Crystal", platform: "GBC", region: "USA, Europe" },
  { name: "Pokemon Diamond", platform: "NDS", region: "USA" },
  { name: "Pokemon Pearl", platform: "NDS", region: "USA" },
  { name: "Pokemon Platinum", platform: "NDS", region: "USA", sha1: "0862EC35B24DE5C7E2DCB88C9EEA0873110D755C" },
  { name: "Pokemon HeartGold", platform: "NDS", region: "USA", sha1: "4FCDED0E2713DC03929845DE631D0932EA2B5A37" },
  { name: "Pokemon SoulSilver", platform: "NDS", region: "USA" },
  { name: "Pokemon Black Version", platform: "NDS", region: "USA" },
  { name: "Pokemon White Version", platform: "NDS", region: "USA" },
  { name: "Pokemon Black Version 2", platform: "NDS", region: "USA" },
  { name: "Pokemon White Version 2", platform: "NDS", region: "USA" },
];


