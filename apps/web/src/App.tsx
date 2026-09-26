import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import { Landing } from "./pages/Landing";
import { AccountGate } from "./pages/AccountGate";
import { FamilyStep } from "./pages/onboarding/FamilyStep";
import { ChildrenStep } from "./pages/onboarding/ChildrenStep";
import { ReadyStep } from "./pages/onboarding/ReadyStep";
import { ProfileSelect } from "./pages/ProfileSelect";
import { ParentLayout } from "./pages/parent/ParentLayout";
import { Dashboard } from "./pages/parent/Dashboard";
import { QuestsManage } from "./pages/parent/QuestsManage";
import { RewardsManage } from "./pages/parent/RewardsManage";
import { ChildrenManage } from "./pages/parent/ChildrenManage";
import { UniversesManage } from "./pages/parent/UniversesManage";
import { ChildLayout } from "./pages/child/ChildLayout";
import { Home } from "./pages/child/Home";
import { Quests } from "./pages/child/Quests";
import { Shop } from "./pages/child/Shop";
import { Collection } from "./pages/child/Collection";
import { CollectionUniverse } from "./pages/child/CollectionUniverse";
import { MoneyLayout } from "./pages/child/money/MoneyLayout";
import { MoneyAccount } from "./pages/child/money/MoneyAccount";
import { MoneyVault } from "./pages/child/money/MoneyVault";
import { MoneyHistory } from "./pages/child/money/MoneyHistory";
import { Invest } from "./pages/child/money/Invest";
import { SupportSheet } from "./pages/child/money/SupportSheet";
import { GameArchive, GamesArchive } from "./pages/child/money/GamesArchive";
import { Orchard } from "./pages/child/money/Orchard";
import { Learn } from "./pages/child/Learn";
import { DevBar } from "./components/DevBar";

function FullScreenLoader() {
  return (
    <div className="centered-auth">
      <p className="text-faint">Chargement…</p>
    </div>
  );
}

/** Accueil du parent après la création du compte : famille → enfants → prêt. */
function OnboardingRoute({ step }: { step: "famille" | "enfants" | "pret" }) {
  const { session } = useAuth();
  if (session?.kind === "child") return <Navigate to="/enfant" replace />;
  if (session?.kind !== "parent") return <Navigate to="/inscription" replace />;
  // L'écran « prêt » reste affiché une fois l'accueil marqué terminé.
  if (step !== "pret" && session.household.onboardingCompleted) return <Navigate to="/parent" replace />;
  if (step === "famille") return <FamilyStep session={session} />;
  if (step === "enfants") return <ChildrenStep />;
  return <ReadyStep session={session} />;
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  return (
    <>
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/inscription" element={<AccountGate />} />
      <Route path="/connexion" element={<AccountGate />} />
      <Route path="/inscription/*" element={<Navigate to="/accueil/famille" replace />} />
      <Route path="/accueil/famille" element={<OnboardingRoute step="famille" />} />
      <Route path="/accueil/enfants" element={<OnboardingRoute step="enfants" />} />
      <Route path="/accueil/pret" element={<OnboardingRoute step="pret" />} />
      <Route path="/profils" element={<ProfileSelect />} />

      <Route
        path="/parent/*"
        element={
          session?.kind !== "parent" ? (
            <Navigate to="/connexion" replace />
          ) : session.household.onboardingCompleted ? (
            <ParentLayout />
          ) : (
            <Navigate to="/accueil/famille" replace />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="quetes" element={<QuestsManage />} />
        <Route path="boutique" element={<RewardsManage />} />
        <Route path="enfants" element={<ChildrenManage />} />
        <Route path="univers" element={<UniversesManage />} />
      </Route>

      <Route
        path="/enfant/*"
        element={session?.kind === "child" ? <ChildLayout /> : <Navigate to="/profils" replace />}
      >
        <Route index element={<Home />} />
        <Route path="quetes" element={<Quests />} />
        <Route path="boutique" element={<Shop />} />
        <Route path="collection" element={<Collection />} />
        <Route path="collection/:universeId" element={<CollectionUniverse />} />
        <Route path="argent" element={<MoneyLayout />}>
          <Route index element={<MoneyAccount />} />
          <Route path="coffre" element={<MoneyVault />} />
          <Route path="historique" element={<MoneyHistory />} />
          <Route path="investir" element={<Invest />} />
          <Route path="investir/bibliotheque" element={<Learn />} />
          <Route path="investir/verger" element={<Orchard />} />
          <Route path="investir/support/:code" element={<SupportSheet />} />
          <Route path="investir/parties" element={<GamesArchive />} />
          <Route path="investir/parties/:id" element={<GameArchive />} />
        </Route>
        <Route path="coffre" element={<Navigate to="/enfant/argent/coffre" replace />} />
        <Route path="apprendre" element={<Navigate to="/enfant/argent/investir/bibliotheque" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {import.meta.env.DEV && <DevBar />}
    </>
  );
}
