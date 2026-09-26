import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { PrismaClient, CardRarity } from "@prisma/client";
import { DEFAULT_SLOT_CONFIG } from "./boosters.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../prisma/data");
// Dossier d'images copié localement (voir CLAUDE.md) — non suivi par Git, ~330 Mo.
const CARDS_IMAGE_DIR = path.resolve(__dirname, "../../../web/public/cards");

interface ThemeRow {
  id: string;
  title: string;
  sortOrder: number;
}

interface CardRow {
  id: string;
  themeId: string;
  title: string;
  imageUrl: string;
  sortOrder: number;
}

function parseCsv<T>(filePath: string, mapRow: (fields: string[]) => T): T[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.slice(1).map((line) => mapRow(line.split(";")));
}

function loadThemes(): ThemeRow[] {
  return parseCsv(path.join(DATA_DIR, "kidsgamebook-themes.csv"), (f) => ({
    id: f[0],
    title: f[1],
    sortOrder: Number(f[2]),
  }));
}

function loadCards(): CardRow[] {
  return parseCsv(path.join(DATA_DIR, "kidsgamebook-cards.csv"), (f) => ({
    id: f[0],
    themeId: f[1],
    title: f[2],
    imageUrl: f[3],
    sortOrder: Number(f[4]),
  }));
}

/** Normalise pour un matching tolérant aux accents/casse/apostrophes/articles. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’()]/g, " ")
    .replace(/\b(les|la|le|des|du|de|l)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%2C/g, ",");
}

function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Associe chaque thème CSV au dossier d'images local dont le nom normalisé correspond le mieux. */
function matchThemeFolder(themeTitle: string, folders: string[]): string | null {
  const target = normalize(themeTitle);
  let best: string | null = null;
  let bestScore = 0;
  for (const folder of folders) {
    const candidate = normalize(folder);
    if (candidate === target) return folder;
    const score = candidate.includes(target) || target.includes(candidate) ? Math.min(candidate.length, target.length) : 0;
    if (score > bestScore) {
      bestScore = score;
      best = folder;
    }
  }
  return best;
}

/** Associe le titre d'une carte au fichier image du dossier de thème dont le nom correspond. */
function matchCardFile(cardTitle: string, files: string[]): string | null {
  // Le titre CSV comme le nom de fichier peuvent porter un suffixe ", épique" — on l'ignore des deux côtés.
  const target = normalize(cardTitle.split(",")[0]);
  for (const file of files) {
    const base = file.replace(/\.(png|jpg|jpeg|webp)$/i, "").split(",")[0];
    if (normalize(base) === target) return file;
  }
  return null;
}

const RARITY_BY_SUFFIX: Record<string, CardRarity> = {
  commune: "COMMUNE",
  "peu commune": "PEU_COMMUNE",
  rare: "RARE",
  epique: "EPIQUE",
  legendaire: "LEGENDAIRE",
};

/**
 * Distribution de rareté déterministe appliquée à un contenu qui, à l'origine,
 * n'en avait pas (kidsgamebook ne connaît pas la notion de rareté). Si le nom
 * de fichier porte explicitement un suffixe de rareté (ex. "Brachiosaure,
 * épique.png"), on le respecte ; sinon on retombe sur un cycle déterministe
 * parcouru globalement sur l'ensemble des cartes importées, pas par thème, pour
 * répartir les raretés hautes sur plusieurs thèmes plutôt que de les concentrer.
 */
const RARITY_CYCLE: CardRarity[] = [
  "COMMUNE", "PEU_COMMUNE", "COMMUNE", "COMMUNE", "PEU_COMMUNE", "RARE", "COMMUNE", "PEU_COMMUNE", "COMMUNE", "EPIQUE",
  "COMMUNE", "PEU_COMMUNE", "COMMUNE", "COMMUNE", "RARE", "PEU_COMMUNE", "COMMUNE", "COMMUNE", "PEU_COMMUNE", "LEGENDAIRE",
];

function rarityFromFilename(file: string): CardRarity | null {
  const parts = file.replace(/\.(png|jpg|jpeg|webp)$/i, "").split(",");
  if (parts.length < 2) return null;
  const suffix = normalize(parts[1]);
  return RARITY_BY_SUFFIX[suffix] ?? null;
}

export interface ImportedUniverse {
  id: string;
  code: string;
  title: string;
  boosterDefinitionId: string;
}

/**
 * Importe les 14 univers et ~104 cartes du système de collection de
 * "Heros de la classe" (github.com/loukan42/kidsgamebook / herosdelaclasse.com),
 * à partir de l'export CSV de sa base Supabase (prisma/data/kidsgamebook-*.csv,
 * identifiants et titres officiels) et des images sources fournies localement
 * par l'utilisateur (apps/web/public/cards/<thème>/<carte>.png — non suivi par
 * Git, voir CLAUDE.md). Une carte sans image locale correspondante est ignorée
 * plutôt que de pointer vers une image manquante.
 */
export async function importKidsgamebookCollection(prisma: PrismaClient): Promise<ImportedUniverse[]> {
  const themes = loadThemes().sort((a, b) => a.sortOrder - b.sortOrder);
  const cards = loadCards();

  const cardsByTheme = new Map<string, CardRow[]>();
  for (const card of cards) {
    const list = cardsByTheme.get(card.themeId) ?? [];
    list.push(card);
    cardsByTheme.set(card.themeId, list);
  }

  let imageFolders: string[] = [];
  try {
    imageFolders = readdirSync(CARDS_IMAGE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    console.warn(`Dossier d'images introuvable : ${CARDS_IMAGE_DIR} (voir CLAUDE.md pour l'obtenir)`);
  }

  const result: ImportedUniverse[] = [];
  let globalIndex = 0;
  let matchedImages = 0;
  let missingImages = 0;

  for (const theme of themes) {
    const themeCards = cardsByTheme.get(theme.id) ?? [];
    if (themeCards.length === 0) continue;

    const folder = matchThemeFolder(theme.title, imageFolders);
    // Les WebP optimisés (versionnés, servis en production) passent avant les PNG sources (locaux).
    const allFiles = folder ? readdirSync(path.join(CARDS_IMAGE_DIR, folder)) : [];
    const webp = allFiles.filter((f) => f.toLowerCase().endsWith(".webp"));
    const filesInFolder = webp.length > 0 ? webp : allFiles;

    const code = slugify(theme.title);
    // Upserts : l'import se rejoue à chaque déploiement sans doublon ni perte (cartes déjà gagnées).
    const universe = await prisma.universe.upsert({
      where: { code },
      create: { code, title: theme.title, description: null, sortOrder: theme.sortOrder },
      update: { title: theme.title, sortOrder: theme.sortOrder },
    });

    let cardNumber = 1;
    for (const card of themeCards) {
      const file = matchCardFile(card.title, filesInFolder);
      const rarity = (file ? rarityFromFilename(file) : null) ?? RARITY_CYCLE[globalIndex % RARITY_CYCLE.length];
      globalIndex += 1;

      if (file && folder) {
        matchedImages += 1;
      } else {
        missingImages += 1;
      }

      // Vite (dev) ne décode pas %2C avant de résoudre un fichier statique : la virgule
      // doit rester littérale dans l'URL (RFC3986 l'autorise non-encodée dans un segment).
      const artworkUrl = file && folder ? `/cards/${encodePathSegment(folder)}/${encodePathSegment(file)}` : null;

      const name = card.title.split(",")[0].trim();
      await prisma.card.upsert({
        where: { universeId_cardNumber: { universeId: universe.id, cardNumber } },
        create: { universeId: universe.id, cardNumber, name, rarity, artworkUrl },
        update: { name, rarity, artworkUrl },
      });
      cardNumber += 1;
    }

    const boosterData = {
      universeId: universe.id,
      title: `Booster ${theme.title}`,
      cardCount: Math.min(5, themeCards.length),
      rngVersion: "v1",
      slotConfig: DEFAULT_SLOT_CONFIG as object,
    };
    const boosterDefinition = await prisma.boosterDefinition.upsert({
      where: { code: `booster-${code}` },
      create: { code: `booster-${code}`, ...boosterData },
      update: boosterData,
    });

    result.push({ id: universe.id, code, title: theme.title, boosterDefinitionId: boosterDefinition.id });
  }

  console.log(`Import kidsgamebook : ${matchedImages} cartes avec image, ${missingImages} sans image locale.`);

  return result;
}
