import { useState } from "react";

export function PinPad({
  length = 4,
  onSubmit,
  submitting,
  error,
}: {
  length?: number;
  onSubmit: (pin: string) => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const [pin, setPin] = useState("");

  function press(digit: string) {
    if (submitting) return;
    const next = (pin + digit).slice(0, length);
    setPin(next);
    if (next.length === length) {
      onSubmit(next);
      setTimeout(() => setPin(""), 400);
    }
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div style={{ textAlign: "center" }}>
      <label htmlFor="profile-pin" className="sr-only">Code à {length} chiffres</label>
      <input id="profile-pin" className="pin-pad-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern={`[0-9]{${length}}`} maxLength={length} value={pin} disabled={submitting} onChange={(event) => { const next = event.target.value.replace(/\D/g, "").slice(0, length); setPin(next); if (next.length === length) { onSubmit(next); setTimeout(() => setPin(""), 400); } }} />
      <div className="row" aria-hidden="true" style={{ justifyContent: "center", gap: 12, marginBottom: 20 }}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: i < pin.length ? "var(--ink)" : "var(--parchment-dim)",
              border: "1.5px solid var(--parchment-line)",
            }}
          />
        ))}
      </div>

      {error && <p style={{ color: "var(--danger)", fontWeight: 700, marginBottom: 12 }}>{error}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          maxWidth: 280,
          margin: "0 auto",
        }}
      >
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className="btn btn-ghost" style={{ fontSize: 22 }} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <div />
        <button type="button" className="btn btn-ghost" style={{ fontSize: 22 }} onClick={() => press("0")}>
          0
        </button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 18 }} onClick={backspace}>
          ⌫
        </button>
      </div>
    </div>
  );
}
