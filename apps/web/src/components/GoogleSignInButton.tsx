import { useEffect, useRef, useState } from "react";
import { defineCopy, useCopy, useLocale } from "../i18n";
import { api } from "../lib/api";

interface GoogleIdApi {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (parent: HTMLElement, options: { theme: string; size: string; text: string; shape: string; logo_alignment: string; width: number; locale: string }) => void;
}
declare global { interface Window { google?: { accounts: { id: GoogleIdApi } } } }

const COPY = defineCopy({
  fr: { unavailable: "La connexion Google est indisponible pour le moment." },
  en: { unavailable: "Google sign-in is unavailable right now." },
});

let scriptPromise: Promise<void> | null = null;
let initializedClientId: string | null = null;
const callbacks = new Map<symbol, (credential: string) => void>();

function deliverCredential(credential: string) {
  const callback = Array.from(callbacks.values()).at(-1);
  callback?.(credential);
}

function loadGoogleScript(locale: "fr" | "en") {
  if (window.google) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://accounts.google.com/gsi/client?hl=${locale}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); scriptPromise = null; reject(new Error("Google script unavailable")); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const t = useCopy(COPY);
  const { locale } = useLocale();
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [available, setAvailable] = useState(true);
  const registration = useRef(Symbol("google-button"));
  callback.current = onCredential;

  useEffect(() => {
    let live = true;
    api.get<{ clientId: string | null }>("/auth/google/client").then(async ({ clientId }) => {
      if (!clientId || !live) { if (live) setAvailable(false); return; }
      await loadGoogleScript(locale);
      if (!live || !host.current || !window.google) return;
      callbacks.set(registration.current, (credential) => callback.current(credential));
      if (initializedClientId !== clientId) {
        window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => deliverCredential(credential) });
        initializedClientId = clientId;
      }
      host.current.replaceChildren();
      window.google.accounts.id.renderButton(host.current, {
        theme: "filled_black", size: "large", text: "continue_with", shape: "rectangular",
        logo_alignment: "left", width: Math.min(320, host.current.clientWidth || 320), locale,
      });
    }).catch(() => { if (live) setAvailable(false); });
    return () => { live = false; callbacks.delete(registration.current); };
  }, [locale]);

  return available ? <div className="google-signin" ref={host} /> : <p className="google-signin-unavailable">{t.unavailable}</p>;
}
