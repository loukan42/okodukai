import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  POSTER_URL,
  VIDEO_FORMATS,
  VIDEO_TRANSCRIPT,
  type ShareFormatId,
  type SharePlatformId,
} from "../../share/campaign";
import { detectShareCapabilities, defaultFormatForViewport } from "../../share/capabilities";
import { captionFor } from "../../share/captions";
import { buildCampaignUrl } from "../../share/utm";
import { trackShareEvent } from "../../share/analytics";
import {
  copyLink,
  copyText,
  downloadVideo,
  openPlatformIntent,
  shareNative,
  type ShareOutcome,
} from "../../share/shareService";
import { defineCopy, useCopy, useLocale } from "../../i18n";

const COPY = defineCopy({
  fr: {
    title: "Une vidéo prête à partager",
    lead: "12 secondes pour présenter Okodukai à d'autres parents. Aucune donnée de votre enfant n'est utilisée.",
    privacy: "Cette vidéo utilise uniquement des données de démonstration.",
    format: "Format",
    share: "Partager la vidéo",
    download: "Télécharger la vidéo",
    copyLink: "Copier le lien",
    copyCaption: "Copier le texte",
    close: "Fermer",
    play: "Lecture",
    pause: "Pause",
    transcript: "Transcription",
    platforms: "Autres moyens",
    fallback: "Le partage direct de la vidéo n'est pas disponible sur cet appareil. La vidéo a été préparée pour être téléchargée et ajoutée manuellement.",
    instagramHint: "La vidéo est prête. Ajoutez-la à votre Story puis collez le texte proposé.",
    tiktokHint: "Téléchargez la vidéo, ouvrez TikTok, puis collez le texte proposé.",
    copied: "Copié dans le presse-papiers.",
    downloaded: "Téléchargement lancé.",
    opened: "Fenêtre de partage ouverte.",
    cancelled: "Partage annulé.",
    error: "Impossible de terminer cette action. Réessayez.",
    story: "Story 9:16",
    feed: "Post 4:5",
    square: "Carré 1:1",
    landscape: "Paysage 16:9",
  },
  en: {
    title: "A video ready to share",
    lead: "12 seconds to introduce Okodukai to other parents. None of your child's data is used.",
    privacy: "This video uses demo data only.",
    format: "Format",
    share: "Share the video",
    download: "Download the video",
    copyLink: "Copy link",
    copyCaption: "Copy caption",
    close: "Close",
    play: "Play",
    pause: "Pause",
    transcript: "Transcript",
    platforms: "Other ways",
    fallback: "Direct video sharing isn't available on this device. The video is ready to download and add manually.",
    instagramHint: "The video is ready. Add it to your Story, then paste the suggested caption.",
    tiktokHint: "Download the video, open TikTok, then paste the suggested caption.",
    copied: "Copied to the clipboard.",
    downloaded: "Download started.",
    opened: "Share window opened.",
    cancelled: "Share cancelled.",
    error: "We couldn't finish that action. Try again.",
    story: "Story 9:16",
    feed: "Post 4:5",
    square: "Square 1:1",
    landscape: "Landscape 16:9",
  },
});

const PLATFORM_ORDER: SharePlatformId[] = [
  "instagram",
  "tiktok",
  "whatsapp",
  "facebook",
  "x",
  "linkedin",
  "telegram",
  "sms",
  "email",
];

const PLATFORM_LABELS = {
  fr: {
    instagram: "Instagram",
    tiktok: "TikTok",
    whatsapp: "WhatsApp",
    facebook: "Facebook",
    x: "X",
    linkedin: "LinkedIn",
    telegram: "Telegram",
    sms: "SMS",
    email: "E-mail",
  },
  en: {
    instagram: "Instagram",
    tiktok: "TikTok",
    whatsapp: "WhatsApp",
    facebook: "Facebook",
    x: "X",
    linkedin: "LinkedIn",
    telegram: "Telegram",
    sms: "SMS",
    email: "Email",
  },
} as const;

export function ParentShareModal(props: { open: boolean; onClose: () => void }) {
  const t = useCopy(COPY);
  const { locale } = useLocale();
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const caps = useMemo(() => detectShareCapabilities(), []);
  const [formatId, setFormatId] = useState<ShareFormatId>(() => defaultFormatForViewport(caps.isNarrow));
  const [status, setStatus] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const format = VIDEO_FORMATS[formatId];

  useEffect(() => {
    if (!props.open) return;
    void trackShareEvent({ name: "parent_share_modal_opened", format: formatId });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose, formatId]);

  useEffect(() => {
    if (!props.open) {
      videoRef.current?.pause();
      setPlaying(false);
      setStatus(null);
      setHint(null);
    }
  }, [props.open]);

  if (!props.open) return null;

  function note(outcome: ShareOutcome, successMessage?: string) {
    if (outcome.kind === "cancelled") {
      setStatus(t.cancelled);
      return;
    }
    if (outcome.kind === "error" || outcome.kind === "unsupported") {
      if (outcome.kind === "unsupported") setHint(t.fallback);
      else setStatus(t.error);
      return;
    }
    if (successMessage) setStatus(successMessage);
  }

  async function onNativeShare() {
    void trackShareEvent({ name: "parent_share_native_started", format: formatId, platform: "native" });
    const outcome = await shareNative({ formatId, locale, title: "Okodukai" });
    void trackShareEvent({ name: "parent_share_native_returned", format: formatId, platform: "native" });
    note(outcome, outcome.kind === "shared" ? t.opened : undefined);
    if (outcome.kind === "unsupported") setHint(t.fallback);
  }

  async function onDownload() {
    const outcome = await downloadVideo(formatId);
    if (outcome.kind === "downloaded") {
      void trackShareEvent({ name: "parent_share_video_downloaded", format: formatId, platform: "download" });
      setStatus(t.downloaded);
    } else note(outcome);
  }

  async function onCopyLink() {
    const outcome = await copyLink("copy_link");
    if (outcome.kind === "copied") {
      void trackShareEvent({ name: "parent_share_link_copied", format: formatId, platform: "copy_link" });
      setStatus(t.copied);
    } else note(outcome);
  }

  async function onCopyCaption(platform: SharePlatformId = "instagram") {
    const url = buildCampaignUrl({ source: platform });
    const text = `${captionFor(platform, locale, url)}\n\n${url}`;
    const outcome = await copyText(text);
    if (outcome.kind === "copied") {
      void trackShareEvent({ name: "parent_share_caption_copied", format: formatId, platform });
      setStatus(t.copied);
    } else note(outcome);
  }

  async function onPlatform(platform: SharePlatformId) {
    if (platform === "instagram" || platform === "tiktok") {
      setHint(platform === "instagram" ? t.instagramHint : t.tiktokHint);
      await onDownload();
      await onCopyCaption(platform);
      return;
    }
    const outcome = openPlatformIntent({ platform, locale, formatId });
    if (outcome.kind === "opened") {
      void trackShareEvent({ name: "parent_share_platform_opened", format: formatId, platform });
      setStatus(t.opened);
    } else if (outcome.kind === "unsupported") {
      setHint(t.fallback);
      await onCopyCaption(platform);
    } else note(outcome);
  }

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
      void trackShareEvent({ name: "parent_share_video_played", format: formatId });
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function selectFormat(id: ShareFormatId) {
    setFormatId(id);
    void trackShareEvent({ name: "parent_share_format_selected", format: id });
  }

  const labels = PLATFORM_LABELS[locale];

  return (
    <div className="parent-share-modal-root" role="presentation">
      <button type="button" className="parent-share-modal-backdrop" aria-label={t.close} onClick={props.onClose} />
      <div className="parent-share-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="parent-share-modal-header">
          <div>
            <h2 id={titleId}>{t.title}</h2>
            <p>{t.lead}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={props.onClose}>
            {t.close}
          </button>
        </header>

        <div className="parent-share-preview">
          <video
            ref={videoRef}
            className="parent-share-video"
            poster={POSTER_URL}
            controls
            playsInline
            preload="metadata"
            muted={reduceMotion}
            src={format.url}
          />
          <div className="parent-share-preview-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={togglePlay}>
              {playing ? t.pause : t.play}
            </button>
          </div>
        </div>

        <fieldset className="parent-share-formats">
          <legend>{t.format}</legend>
          {(Object.keys(VIDEO_FORMATS) as ShareFormatId[]).map((id) => (
            <label key={id} className={formatId === id ? "is-active" : undefined}>
              <input
                type="radio"
                name="share-format"
                value={id}
                checked={formatId === id}
                onChange={() => selectFormat(id)}
              />
              {t[id]}
            </label>
          ))}
        </fieldset>

        <p className="parent-share-privacy">{t.privacy}</p>
        {hint && <p className="parent-share-hint" role="status">{hint}</p>}
        {status && <p className="parent-share-status" role="status">{status}</p>}

        <div className="parent-share-primary-actions">
          {(caps.canShare || caps.canShareFiles) && (
            <button type="button" className="btn btn-primary" onClick={() => void onNativeShare()}>
              {t.share}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => void onDownload()}>
            {t.download}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void onCopyLink()}>
            {t.copyLink}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void onCopyCaption("native")}>
            {t.copyCaption}
          </button>
        </div>

        {!caps.canShareFiles && !caps.canShare && <p className="parent-share-hint">{t.fallback}</p>}

        <div className="parent-share-platforms" role="group" aria-label={t.platforms}>
          {PLATFORM_ORDER.map((platform) => (
            <button key={platform} type="button" className="btn btn-ghost btn-sm" onClick={() => void onPlatform(platform)}>
              {labels[platform as keyof typeof labels]}
            </button>
          ))}
        </div>

        <details className="parent-share-transcript">
          <summary>{t.transcript}</summary>
          <p>{VIDEO_TRANSCRIPT[locale]}</p>
        </details>
      </div>
    </div>
  );
}
