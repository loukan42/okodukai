import { LOCALES, useLocale, type Locale } from "../i18n";

const NAMES: Record<Locale, string> = { fr: "Français", en: "English" };

/** Choix de la langue : deux boutons « FR » et « EN », le choix est mémorisé sur l'appareil. */
export function LanguageSwitch({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
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
          onClick={() => locale !== code && setLocale(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
