import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { GameIcon } from "../../components/GameIcon";
import { Lessons } from "../../components/invest/Lessons";
import { Carnet } from "../../components/finance/Carnet";
import { ObjectArt } from "../../art/ObjectArt";
import { useAuth } from "../../lib/AuthContext";

interface ModuleContent {
  situation: string;
  choice: { a: string; b: string };
  consequence: string;
  explanation: string;
  vocabulary: string;
  /** Les propositions seulement : la bonne réponse reste sur le serveur. */
  quiz: { question: string; options: string[] };
}

interface ModuleRow {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  rewardXp: number;
  content: ModuleContent;
}

type Step = "situation" | "consequence" | "quiz" | "done";

function sceneFor(subtitle: string) {
  if (/inflation/i.test(subtitle)) return "inflation";
  if (/épargne|epargne/i.test(subtitle)) return "compound";
  if (/risque/i.test(subtitle)) return "risk";
  return "diversification";
}

function LearningScene({ subtitle, className = "" }: { subtitle: string; className?: string }) {
  const scene = sceneFor(subtitle);
  return <img className={className} src={`/assets/learning/learning-${scene}-320.webp`} srcSet={`/assets/learning/learning-${scene}-320.webp 320w, /assets/learning/learning-${scene}-640.webp 640w`} sizes={className === "learning-detail-scene" ? "(max-width: 640px) 100vw, 640px" : "(max-width: 640px) 90px, 136px"} alt="" loading="lazy" decoding="async" />;
}

export function Learn() {
  const { session } = useAuth();
  const older = session?.kind === "child" && session.child.ageBand === "AGE_10_12";
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [active, setActive] = useState<ModuleRow | null>(null);
  const [step, setStep] = useState<Step>("situation");
  const [xpAwarded, setXpAwarded] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    api.get<{ modules: ModuleRow[] }>("/child/learning/modules").then((res) => setModules(res.modules));
  }, []);

  function open(mod: ModuleRow) {
    setActive(mod);
    setStep("situation");
    setFeedback(null);
  }

  async function answerQuiz(choice: number) {
    if (!active || answering) return;
    setAnswering(true);
    try {
      const res = await api.post<{ correct: boolean; explanation: string; xpAwarded: number }>(`/child/learning/modules/${active.id}/complete`, { choice });
      setFeedback({ correct: res.correct, explanation: res.explanation });
      if (res.correct) {
        setXpAwarded(res.xpAwarded);
        setStep("done");
      }
    } finally {
      setAnswering(false);
    }
  }

  if (active) {
    return (
      <div className="stack learning-detail">
        <LearningScene subtitle={active.subtitle} className="learning-detail-scene" />
        <div className="card">
          <p className="text-sm text-faint">{active.subtitle}</p>
          <h1 className="font-display" style={{ fontSize: 22, marginBottom: 16 }}>
            {active.title}
          </h1>

          {step === "situation" && (
            <>
              <p style={{ marginBottom: 16 }}>{active.content.situation}</p>
              <div className="stack">
                <button className="btn btn-ghost btn-block" onClick={() => setStep("consequence")}>
                  {active.content.choice.a}
                </button>
                <button className="btn btn-primary btn-block" onClick={() => setStep("consequence")}>
                  {active.content.choice.b}
                </button>
              </div>
            </>
          )}

          {step === "consequence" && (
            <>
              <p style={{ marginBottom: 12 }}>{active.content.consequence}</p>
              <p className="text-faint" style={{ marginBottom: 12 }}>
                {active.content.explanation}
              </p>
              <p className="card--tight" style={{ background: "var(--sky-soft)", borderRadius: 10, padding: 12, fontWeight: 700 }}>
                <GameIcon name="learn" size={19}/> {active.content.vocabulary}
              </p>
              <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => setStep("quiz")}>
                Continuer
              </button>
            </>
          )}

          {step === "quiz" && (
            <>
              <p style={{ fontWeight: 700, marginBottom: 16 }}>{active.content.quiz.question}</p>
              <div className="stack">
                {active.content.quiz.options.map((option, i) => (
                  <button key={option} className="btn btn-ghost btn-block" disabled={answering} onClick={() => void answerQuiz(i)}>
                    {option}
                  </button>
                ))}
              </div>
              {feedback && !feedback.correct && (
                <div className="learn-feedback" role="status">
                  <strong>Pas tout à fait.</strong>
                  <p>{feedback.explanation}</p>
                  <p>Tu peux choisir une autre réponse.</p>
                </div>
              )}
            </>
          )}

          {step === "done" && (
            <div className="text-center">
              <span className="learn-complete-icon"><GameIcon name="check" size={32}/></span>
              <p style={{ fontWeight: 700 }}>{xpAwarded > 0 ? `Bien joué ! +${xpAwarded} XP` : "Bien joué ! Tu avais déjà terminé ce module."}</p>
              {feedback?.explanation && <p className="text-faint">{feedback.explanation}</p>}
              <button
                className="btn btn-primary btn-block"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setActive(null);
                  api.get<{ modules: ModuleRow[] }>("/child/learning/modules").then((res) => setModules(res.modules));
                }}
              >
                Retour
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return <EmptyState art="coin-sprout" title="Pas encore de module" subtitle="Reviens bientôt pour apprendre de nouvelles choses." />;
  }

  return (
    <div className="stack learn-page">
      <header className="page-scene-title page-scene-title--art"><ObjectArt name="bookshelf" size={132} /><div><p className="scene-kicker">La bibliothèque de l'observatoire</p><h1>Apprendre</h1><p>Comprends l'argent à ton rythme.</p></div></header>
      {older && <Lessons />}
      {modules.map((m) => (
        <button
          key={m.id}
          className="learning-module"
          style={{ cursor: "pointer", width: "100%", textAlign: "left" }}
          onClick={() => open(m)}
        >
          <LearningScene subtitle={m.subtitle} className="learning-module-art" />
          <div className="learning-module-copy">
            <strong>{m.title}</strong>
            <small>{m.subtitle}</small>
          </div>
          <span className="pill" style={{ background: m.status === "TERMINE" ? "var(--forest-soft)" : "var(--parchment-dim)" }}>
            {m.status === "TERMINE" ? "✓ Fait" : `+${m.rewardXp} XP`}
          </span>
        </button>
      ))}
      <Carnet />
    </div>
  );
}
