import type { Locale } from "./config";
import type { Dictionary } from "./types";
import { en } from "./en";
import { ka } from "./ka";
import { tr } from "./tr";

export const dictionaries: Record<Locale, Dictionary> = { en, ka, tr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
