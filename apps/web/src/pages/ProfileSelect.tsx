import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth, LAST_HOUSEHOLD_KEY } from "../lib/AuthContext";
import { Avatar } from "../components/Avatar";
import { PinPad } from "../components/PinPad";
import { defineCopy, useCopy } from "../i18n";

interface ChildOption {
  id: string;
  displayName: string;
  avatarId: string;
  ageBand: string;
}

const COPY = defineCopy({
  fr: {
    needsParent: "Connectez-vous d'abord en tant que parent sur cet appareil.",
    parentLogin: "Connexion parent",
    wrongCode: "Code incorrect",
    hello: (name: string) => `Salut ${name} !`,
    change: "← Changer de profil",
    choose: "Choisis ton profil",
  },
  en: {
    needsParent: "Log in as a parent on this device first.",
    parentLogin: "Parent login",
    wrongCode: "Wrong code",
    hello: (name: string) => `Hi ${name}!`,
    change: "← Choose another profile",
    choose: "Choose your profile",
  },
});

export function ProfileSelect() {
  const t = useCopy(COPY);
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selected, setSelected] = useState<ChildOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const householdId = localStorage.getItem(LAST_HOUSEHOLD_KEY);
  // Appareil pas encore « familial » (aucun parent connecté ici depuis la mise à jour) : on le dit.
  const [needsParent, setNeedsParent] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    api
      .get<{ children: ChildOption[] }>(`/auth/households/${householdId}/children`)
      .then((res) => setChildren(res.children))
      .catch((err) => {
        setChildren([]);
        if (err instanceof ApiError && err.status === 403) setNeedsParent(true);
      });
  }, [householdId]);

  if (!householdId || needsParent) {
    return (
      <div className="centered-auth">
        <p className="text-faint">{t.needsParent}</p>
        <Link to="/connexion" className="btn btn-primary">
          {t.parentLogin}
        </Link>
      </div>
    );
  }

  async function submitPin(pin: string) {
    if (!selected || !householdId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/auth/households/${householdId}/children/${selected.id}/login`, { pin });
      await refresh();
      navigate("/enfant", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.wrongCode);
    } finally {
      setSubmitting(false);
    }
  }

  if (selected) {
    return (
      <div className="centered-auth">
        <div style={{ textAlign: "center", width: "100%", maxWidth: 380 }}>
          <Avatar avatarId={selected.avatarId} size="lg" />
          <h1 className="font-display" style={{ fontSize: 24, margin: "12px 0 24px" }}>
            {t.hello(selected.displayName)}
          </h1>
          <PinPad onSubmit={submitPin} submitting={submitting} error={error} />
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 24 }} onClick={() => setSelected(null)}>
            {t.change}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="centered-auth">
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <h1 className="font-display" style={{ fontSize: 26, marginBottom: 24 }}>
          {t.choose}
        </h1>
        <div className="row-wrap" style={{ justifyContent: "center", gap: 20 }}>
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelected(child)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                minWidth: 96,
                minHeight: 44,
              }}
            >
              <Avatar avatarId={child.avatarId} size="lg" />
              <span style={{ fontWeight: 700 }}>{child.displayName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
