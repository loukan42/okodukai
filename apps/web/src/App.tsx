import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import { Landing } from "./pages/Landing";
import { RegisterHousehold } from "./pages/RegisterHousehold";
import { Login } from "./pages/Login";
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
import { Vault } from "./pages/child/Vault";
import { Learn } from "./pages/child/Learn";

function FullScreenLoader() {
  return (
    <div className="centered-auth">
      <p className="text-faint">Chargement…</p>
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/inscription" element={<RegisterHousehold />} />
      <Route path="/connexion" element={<Login />} />
      <Route path="/profils" element={<ProfileSelect />} />

      <Route
        path="/parent/*"
        element={session?.kind === "parent" ? <ParentLayout /> : <Navigate to="/connexion" replace />}
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
        <Route path="coffre" element={<Vault />} />
        <Route path="apprendre" element={<Learn />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
