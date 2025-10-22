import { IconType } from "react-icons";
import { MdCatchingPokemon, MdNewReleases, MdAutoFixHigh, MdSettingsSuggest } from "react-icons/md";
import { BiSolidGame } from "react-icons/bi";
import { FaClock, FaGaugeHigh, FaMasksTheater } from "react-icons/fa6";
import { IoLogoGameControllerA } from "react-icons/io";

export const CATEGORY_ICONS: Record<string, IconType> = {
  "Pokédex": MdCatchingPokemon,
  "Sprites": BiSolidGame,
  "New": MdNewReleases,
  "Altered": MdAutoFixHigh,
  "Quality of Life": MdSettingsSuggest,
  "Gameplay": IoLogoGameControllerA,
  "Difficulty": FaGaugeHigh,
  "Scale": FaClock,
  "Tone": FaMasksTheater,
};

export function getCategoryIcon(category: string | null | undefined): IconType | undefined {
  if (!category) return undefined;
  return CATEGORY_ICONS[category];
}


