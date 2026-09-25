import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { GameIcon } from "../../components/GameIcon";

interface ModuleContent {
  situation: string;
  choice: { a: string; b: string };
  consequence: string;
  explanation: string;
  vocabulary: string;
  quiz: { question: string; answer: string };
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

export function Learn() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [active, setActive] = useState<ModuleRow | null>(null);
  const [step, setStep] = useState<Step>("situation");
  const [xpAwarded, setXpAwarded] = useState(0);

  useEffect(() => {
    api.get<{ modules: ModuleRow[] }>("/child/learning/modules").then((res) => setModules(res.modules));
  }, []);

  function open(mod: ModuleRow) {
    setActive(mod);
    setStep("situation");
  }

  async function answerQuiz(choice: string) {
    if (!active) return;
    const correct = choice === active.content.quiz.answer;
    const res = await api.post<{ xpAwarded: number }>(`/child/learning/modules/${active.id}/complete`, { correct });
    if (correct) {
      setXpAwarded(res.xpAwarded);
      setStep("done");
    } else {
      setStep("situation");
      setActive(null);
    }
  }

  if (active) {
    return (
      <div className="stack">
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
                <button className="btn btn-ghost btn-block" onClick={() => answerQuiz(active.content.quiz.answer)}>
                  {active.content.quiz.answer}
                </button>
                <button className="btn btn-ghost btn-block" onClick={() => answerQuiz("__wrong__")}>
                  Je ne sais pas
                </button>
              </div>
            </>
          )}

          {step === "done" && (
            <div className="text-center">
              <span className="learn-complete-icon"><GameIcon name="check" size={32}/></span>
              <p style={{ fontWeight: 700 }}>Bien joué ! +{xpAwarded} XP</p>
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
    return <EmptyState icon="learn" title="Pas encore de module" subtitle="Reviens bientôt pour apprendre de nouvelles choses." />;
  }

  return (
    <div className="stack learn-page">
      <header className="page-scene-title"><span className="page-scene-icon"><GameIcon name="learn" size={30}/></span><div><p className="scene-kicker">Faire des choix</p><h1>Apprendre</h1><p>Comprends l'argent à ton rythme.</p></div></header>
      {modules.map((m) => (
        <button
          key={m.id}
          className="card card-row"
          style={{ border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
          onClick={() => open(m)}
        >
          <div>
            <p style={{ fontWeight: 700, margin: 0 }}>{m.title}</p>
            <p className="text-sm text-faint" style={{ margin: 0 }}>
              {m.subtitle}
            </p>
          </div>
          <span className="pill" style={{ background: m.status === "TERMINE" ? "var(--forest-soft)" : "var(--parchment-dim)" }}>
            {m.status === "TERMINE" ? "✓ Fait" : `+${m.rewardXp} XP`}
          </span>
        </button>
      ))}
    </div>
  );
}
