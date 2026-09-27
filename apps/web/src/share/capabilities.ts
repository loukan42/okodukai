export interface ShareCapabilities {
  canShare: boolean;
  canShareFiles: boolean;
  canClipboard: boolean;
  isNarrow: boolean;
}

export function detectShareCapabilities(
  nav: Pick<Navigator, "share" | "canShare" | "clipboard"> | Navigator = typeof navigator !== "undefined" ? navigator : ({} as Navigator),
  width = typeof window !== "undefined" ? window.innerWidth : 1024,
): ShareCapabilities {
  const canShare = typeof nav.share === "function";
  let canShareFiles = false;
  if (canShare && typeof nav.canShare === "function") {
    try {
      const probe = new File(["okodukai"], "okodukai-probe.mp4", { type: "video/mp4" });
      canShareFiles = nav.canShare({ files: [probe] });
    } catch {
      canShareFiles = false;
    }
  }
  const canClipboard = Boolean(nav.clipboard && typeof nav.clipboard.writeText === "function");
  return { canShare, canShareFiles, canClipboard, isNarrow: width < 768 };
}

export function defaultFormatForViewport(isNarrow: boolean): "story" | "feed" | "square" | "landscape" {
  return isNarrow ? "story" : "feed";
}
