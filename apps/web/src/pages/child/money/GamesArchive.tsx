import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import type { InvestRun } from "../../../lib/invest";
import { GameEnd } from "../../../components/invest/GameEnd";
import { EmptyState } from "../../../components/EmptyState";
import { GameIcon } from "../../../components/GameIcon";
import { defineCopy, useCopy } from "../../../i18n";
import { dateFormatter } from "../../../i18n/format";

interface Game {
  id: string;
  mode: "MIROIR" | "ASSURANCE_VIE";
  story: string | null;
  years: number;
  startedAt: string;
  finishedAt: string | null;
}

const DATE = dateFormatter({ day: "numeric", month: "long" });

const COPY = defineCopy({
  fr: {
    back: "Retour à l'observatoire",
    title: "Mes parties",
    hint: "Chaque partie raconte une histoire de marché différente : on les relit, on ne les compare pas.",
    loading: "Ouverture des archives…",
    empty: "Pas encore de partie terminée",
    emptyHint: "Quand ta première partie sera finie, tu pourras la relire ici.",
    place: (orchard: boolean, years: number) => `${orchard ? "Verger du temps long" : "Observatoire"} · ${years} ans`,
    story: (s: string | null) => (s ? `Une histoire de ${s.replace(/^une? /, "")}` : "Histoire terminée"),
    started: (d: string) => `Commencée le ${d}`,
    finished: (d: string) => `, terminée le ${d}`,
    games: "Mes parties",
    error: "Cette partie ne s'ouvre pas.",
    opening: "Ouverture de la partie…",
  },
  en: {
    back: "Back to the observatory",
    title: "My games",
    hint: "Each game tells a different market story: you read them again, you don't compare them.",
    loading: "Opening the archive…",
    empty: "No finished game yet",
    emptyHint: "When your first game is over, you can read it again here.",
    place: (orchard: boolean, years: number) => `${orchard ? "Long-term orchard" : "Observatory"} · ${years} years`,
    story: (s: string | null) => (s ? `Story: ${s}` : "Story finished"),
    started: (d: string) => `Started on ${d}`,
    finished: (d: string) => `, finished on ${d}`,
    games: "My games",
    error: "This game can't open.",
    opening: "Opening the game…",
  },
});

/** Mes parties (E16) : l'histoire et les dates de chaque partie, jamais un classement par valeur. */
export function GamesArchive() {
  const t = useCopy(COPY);
  const [games, setGames] = useState<Game[] | null>(null);
  useEffect(() => {
    api
      .get<{ games: Game[] }>("/child/invest/games")
      .then((r) => setGames(r.games))
      .catch(() => setGames([]));
  }, []);

  return (
    <div className="money-page">
      <Link to="/enfant/argent/investir" className="support-sheet-back">
        <GameIcon name="arrow" size={16} /> {t.back}
      </Link>
      <h1>{t.title}</h1>
      <p className="money-hint">{t.hint}</p>
      {games === null ? (
        <p className="loading-message" role="status">{t.loading}</p>
      ) : games.length === 0 ? (
        <EmptyState art="hourglass" title={t.empty} subtitle={t.emptyHint} />
      ) : (
        <ul className="games-list">
          {games.map((g) => (
            <li key={g.id}>
              <Link to={`/enfant/argent/investir/parties/${g.id}`}>
                <strong>{t.place(g.mode === "ASSURANCE_VIE", g.years)}</strong>
                <span>{t.story(g.story)}</span>
                <small>
                  {t.started(DATE.format(new Date(g.startedAt)))}
                  {g.finishedAt ? t.finished(DATE.format(new Date(g.finishedAt))) : ""}
                </small>
                <GameIcon name="arrow" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GameArchive() {
  const t = useCopy(COPY);
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const young = session?.kind === "child" && session.child.ageBand === "AGE_8_9";
  const [run, setRun] = useState<InvestRun | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<{ run: InvestRun }>(`/child/invest/games/${id}`)
      .then((r) => setRun(r.run))
      .catch(() => setError(true));
  }, [id]);

  return (
    <div className="money-page">
      <Link to="/enfant/argent/investir/parties" className="support-sheet-back">
        <GameIcon name="arrow" size={16} /> {t.games}
      </Link>
      {error ? <p className="form-error" role="alert">{t.error}</p> : run ? <GameEnd run={run} young={young} archived /> : <p className="loading-message" role="status">{t.opening}</p>}
    </div>
  );
}
