import { RARITY_LABELS_BY_LOCALE, type CardRarity } from "@okodukai/shared";
import { localized } from "../i18n";

/** Nom de la rareté dans la langue courante : « Épique » ou « Epic ». */
export const RARITY_LABELS: Record<CardRarity, string> = localized(RARITY_LABELS_BY_LOCALE);
