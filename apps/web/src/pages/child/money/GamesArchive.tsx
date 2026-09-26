import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import type { InvestRun } from "../../../lib/invest";
import { GameEnd } from "../../../components/invest/GameEnd";
import { EmptyState } from "../../../components/EmptyState";
import { GameIcon } from "../../../components/GameIcon";

interface Game {
  id: string;
  mode: "MIROIR" | "ASSURANCE_VIE";
  story: string | null;
  years: number;
  startedAt: string;
  finishedAt: string | null;
}

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/** Mes parties (E16) : l'histoire et les dates de chaque partie, jamais un classement par valeur. */
export function GamesArchive() {
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
        <GameIcon name="arrow" size={16} /> Retour à l'observatoire
      </Link>
      <h1>Mes parties</h1>
      <p className="money-hint">Chaque partie raconte une histoire de marché différente : on les relit, on ne les compare pas.</p>
      {games === null ? (
        <p className="loading-message" role="status">Ouverture des archives…</p>
      ) : games.length === 0 ? (
        <EmptyState art="hourglass" title="Pas encore de partie terminée" subtitle="Quand ta première partie sera finie, tu pourras la relire ici." />
      ) : (
        <ul className="games-list">
          {games.map((g) => (
            <li key={g.id}>
              <Link to={`/enfant/argent/investir/parties/${g.id}`}>
                <strong>{g.mode === "ASSURANCE_VIE" ? "Verger du temps long" : "Observatoire"} · {g.years} ans</strong>
                <span>{g.story ? `Une histoire de ${g.story.replace(/^une? /, "")}` : "Histoire terminée"}</span>
                <small>
                  Commencée le {DATE.format(new Date(g.startedAt))}
                  {g.finishedAt ? `, terminée le ${DATE.format(new Date(g.finishedAt))}` : ""}
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
        <GameIcon name="arrow" size={16} /> Mes parties
      </Link>
      {error ? <p className="form-error" role="alert">Cette partie ne s'ouvre pas.</p> : run ? <GameEnd run={run} young={young} archived /> : <p className="loading-message" role="status">Ouverture de la partie…</p>}
    </div>
  );
}
