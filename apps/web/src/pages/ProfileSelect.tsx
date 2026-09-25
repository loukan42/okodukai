import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth, LAST_HOUSEHOLD_KEY } from "../lib/AuthContext";
import { Avatar } from "../components/Avatar";
import { PinPad } from "../components/PinPad";

interface ChildOption {
  id: string;
  displayName: string;
  avatarId: string;
  ageBand: string;
}

export function ProfileSelect() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selected, setSelected] = useState<ChildOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const householdId = localStorage.getItem(LAST_HOUSEHOLD_KEY);

  useEffect(() => {
    if (!householdId) return;
    api
      .get<{ children: ChildOption[] }>(`/auth/households/${householdId}/children`)
      .then((res) => setChildren(res.children))
      .catch(() => setChildren([]));
  }, [householdId]);

  if (!householdId) {
    return (
      <div className="centered-auth">
        <p className="text-faint">Connectez-vous d'abord en tant que parent sur cet appareil.</p>
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
      setError(err instanceof ApiError ? err.message : "Code incorrect");
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
            Salut {selected.displayName} !
          </h1>
          <PinPad onSubmit={submitPin} submitting={submitting} error={error} />
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 24 }} onClick={() => setSelected(null)}>
            ← Changer de profil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="centered-auth">
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <h1 className="font-display" style={{ fontSize: 26, marginBottom: 24 }}>
          Choisis ton profil
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
