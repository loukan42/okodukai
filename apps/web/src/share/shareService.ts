import { VIDEO_FORMATS, type ShareFormatId, type SharePlatformId } from "./campaign";
import { captionFor, EMAIL_SUBJECT, type CaptionLocale } from "./captions";
import { buildCampaignUrl } from "./utm";

export type ShareOutcome =
  | { kind: "shared" }
  | { kind: "cancelled" }
  | { kind: "unsupported" }
  | { kind: "copied" }
  | { kind: "downloaded" }
  | { kind: "opened" }
  | { kind: "error"; message: string };

export async function fetchVideoFile(formatId: ShareFormatId): Promise<File> {
  const format = VIDEO_FORMATS[formatId];
  const res = await fetch(format.url);
  if (!res.ok) throw new Error("video_unavailable");
  const blob = await res.blob();
  const type = blob.type && blob.type.startsWith("video/") ? blob.type : "video/mp4";
  return new File([blob], format.fileName, { type });
}

export async function shareNative(options: {
  formatId: ShareFormatId;
  locale: CaptionLocale;
  title: string;
}): Promise<ShareOutcome> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return { kind: "unsupported" };
  }
  const url = buildCampaignUrl({ source: "native" });
  const text = captionFor("native", options.locale);
  try {
    let files: File[] | undefined;
    try {
      const file = await fetchVideoFile(options.formatId);
      if (navigator.canShare?.({ files: [file] })) files = [file];
    } catch {
      files = undefined;
    }
    const payload: ShareData = files
      ? { files, title: options.title, text, url }
      : { title: options.title, text: `${text}\n\n${url}`, url };
    if (navigator.canShare && !navigator.canShare(payload)) {
      await navigator.share({ title: options.title, text: `${text}\n\n${url}`, url });
    } else {
      await navigator.share(payload);
    }
    return { kind: "shared" };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { kind: "cancelled" };
    return { kind: "error", message: err instanceof Error ? err.message : "share_failed" };
  }
}

export async function copyText(text: string): Promise<ShareOutcome> {
  try {
    if (!navigator.clipboard?.writeText) return { kind: "unsupported" };
    await navigator.clipboard.writeText(text);
    return { kind: "copied" };
  } catch {
    return { kind: "error", message: "clipboard_failed" };
  }
}

export async function copyLink(source: string): Promise<ShareOutcome> {
  return copyText(buildCampaignUrl({ source }));
}

export async function downloadVideo(formatId: ShareFormatId): Promise<ShareOutcome> {
  try {
    const format = VIDEO_FORMATS[formatId];
    const res = await fetch(format.url);
    if (!res.ok) return { kind: "error", message: "video_unavailable" };
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = format.fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    return { kind: "downloaded" };
  } catch {
    return { kind: "error", message: "download_failed" };
  }
}

function openUrl(href: string): ShareOutcome {
  window.open(href, "_blank", "noopener,noreferrer");
  return { kind: "opened" };
}

export function openPlatformIntent(options: {
  platform: SharePlatformId;
  locale: CaptionLocale;
  formatId: ShareFormatId;
}): ShareOutcome {
  const url = buildCampaignUrl({ source: options.platform });
  const text = captionFor(options.platform, options.locale, url);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  switch (options.platform) {
    case "whatsapp":
      return openUrl(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`);
    case "telegram":
      return openUrl(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`);
    case "x":
      return openUrl(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`);
    case "linkedin":
      return openUrl(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`);
    case "facebook":
      return openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
    case "messenger":
      // Sans identifiant d'application Facebook, le web ne peut pas ouvrir Messenger de façon fiable.
      return { kind: "unsupported" };
    case "sms":
      return openUrl(`sms:?&body=${encodeURIComponent(`${text}\n${url}`)}`);
    case "email": {
      const subject = encodeURIComponent(EMAIL_SUBJECT[options.locale]);
      const body = encodeURIComponent(captionFor("email", options.locale, url));
      return openUrl(`mailto:?subject=${subject}&body=${body}`);
    }
    case "instagram":
    case "tiktok":
      // Pas de publication directe fiable depuis le web : le parent télécharge / partage nativement.
      return { kind: "unsupported" };
    case "native":
    case "copy_link":
    case "copy_caption":
    case "download":
      return { kind: "unsupported" };
    default: {
      const _exhaustive: never = options.platform;
      return _exhaustive;
    }
  }
}
