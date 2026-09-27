import { useEffect } from "react";
import {
  ACTIVE_BANNER_VARIANT,
  ACTIVE_CTA_VARIANT,
  BANNER_VARIANTS,
  CTA_VARIANTS,
  POSTER_URL,
} from "../../share/campaign";
import { trackShareEvent } from "../../share/analytics";
import { dismissShareCard } from "../../share/dismiss";
import { defineCopy, useCopy, useLocale } from "../../i18n";

const COPY = defineCopy({
  fr: {
    title: "Faites découvrir Okodukai",
    dismiss: "Masquer",
    duration: "12 secondes · vidéo de démonstration",
  },
  en: {
    title: "Help others discover Okodukai",
    dismiss: "Hide",
    duration: "12 seconds · demo video",
  },
});

export function ParentShareCard(props: { onOpen: () => void; onDismiss: () => void }) {
  const t = useCopy(COPY);
  const { locale } = useLocale();
  const banner = BANNER_VARIANTS[ACTIVE_BANNER_VARIANT][locale];
  const cta = CTA_VARIANTS[ACTIVE_CTA_VARIANT][locale];

  useEffect(() => {
    void trackShareEvent({ name: "parent_share_card_viewed" });
  }, []);

  function hide() {
    dismissShareCard();
    void trackShareEvent({ name: "parent_share_card_dismissed" });
    props.onDismiss();
  }

  return (
    <section className="parent-share-card" aria-labelledby="parent-share-card-title">
      <div className="parent-share-card-media" aria-hidden="true">
        <img src={POSTER_URL} alt="" width={120} height={213} loading="lazy" decoding="async" />
      </div>
      <div className="parent-share-card-copy">
        <h2 id="parent-share-card-title">{t.title}</h2>
        <p>{banner}</p>
        <p className="parent-share-card-meta">{t.duration}</p>
        <div className="parent-share-card-actions">
          <button type="button" className="btn btn-primary" onClick={props.onOpen}>
            {cta}
          </button>
          <button type="button" className="btn btn-ghost" onClick={hide}>
            {t.dismiss}
          </button>
        </div>
      </div>
    </section>
  );
}
