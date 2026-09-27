import { LOCALES, useLocale, type Locale } from "../i18n";

const NAMES: Record<Locale, string> = { fr: "Français", en: "English" };

/**
 * Choix de la langue : deux boutons « FR » et « EN », mémorisé sur l'appareil. `onChange` permet de
 * l'enregistrer aussi pour la famille (en-tête parent). Pas de choix côté enfant : il suit le parent.
 */
export function LanguageSwitch({ className = "", tone = "light", onChange }: { className?: string; tone?: "light" | "dark"; onChange?: (locale: Locale) => void }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className={`lang-switch lang-switch--${tone} ${className}`.trim()} role="group" aria-label={locale === "fr" ? "Langue" : "Language"}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          className="lang-switch-option"
          aria-pressed={locale === code}
          aria-label={NAMES[code]}
          title={NAMES[code]}
          onClick={() => {
            if (locale === code) return;
            setLocale(code);
            onChange?.(code);
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
