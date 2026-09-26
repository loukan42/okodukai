// « Ton relevé est prêt. » (FINANCIAL_EDUCATION §8.4) : seulement si le parent l'a activé, un seul
// texte (jamais de chiffre ni de sens de variation), au plus une fois par relevé et par jour réel,
// jamais la nuit. Appelé par une tâche planifiée (Vercel Cron) : l'API n'a pas de processus permanent.
import { prisma } from "./prisma.js";
import { activeRun, syncRun } from "./invest.js";
import { pushToChild } from "./push.js";

const PARTS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
function paris(now: Date) {
  const p = Object.fromEntries(PARTS.formatToParts(now).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

/** Nuit (20 h – 8 h, heure de Paris) : aucune notification ; les relevés attendent le lendemain. */
export const isQuietHour = (now: Date) => {
  const { hour } = paris(now);
  return hour >= 20 || hour < 8;
};

export const STATEMENT_READY = "Ton relevé est prêt.";

export async function notifyReadyStatements(now = new Date()) {
  if (isQuietHour(now)) return { notified: 0, quiet: true };
  const today = paris(now).day;
  const settings = await prisma.investSettings.findMany({ where: { enabled: true, notifyStatement: true } });
  let notified = 0;
  for (const s of settings) {
    const run = await activeRun(prisma, s.childId);
    if (!run || run.status !== "EN_COURS") continue;
    await syncRun(prisma, run, now);
    const pending = await prisma.simulationSnapshot.findMany({ where: { runId: run.id, seenAt: null, notifiedAt: null }, select: { id: true } });
    if (pending.length === 0) continue;
    const last = await prisma.notification.findFirst({ where: { childId: s.childId, type: "releve_pret" }, orderBy: { createdAt: "desc" } });
    if (last && paris(last.createdAt).day === today) continue;
    const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: s.childId } });
    await prisma.$transaction([
      prisma.notification.create({ data: { householdId: child.householdId, audience: "CHILD", childId: child.id, type: "releve_pret", payload: { text: STATEMENT_READY }, createdAt: now } }),
      prisma.simulationSnapshot.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { notifiedAt: now } }),
    ]);
    await pushToChild(child.id, { title: "Okodukai", body: STATEMENT_READY, url: "/enfant/argent/investir" });
    notified++;
  }
  return { notified, quiet: false };
}
