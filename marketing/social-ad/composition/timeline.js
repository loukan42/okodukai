(() => {
  const stage = document.getElementById("stage");
  const params = new URLSearchParams(location.search);
  const variant = params.get("variant") || "story12";
  const ratio = params.get("ratio") || "9x16";
  const assetBase = params.get("assets") || "";

  const sizes = {
    "9x16": { w: 1080, h: 1920 },
    "4x5": { w: 1080, h: 1350 },
    "1x1": { w: 1080, h: 1080 },
    "16x9": { w: 1920, h: 1080 },
  };
  const size = sizes[ratio] || sizes["9x16"];
  stage.dataset.variant = variant;
  stage.dataset.ratio = ratio;
  stage.style.width = `${size.w}px`;
  stage.style.height = `${size.h}px`;

  const coinSrc = `${assetBase}/assets/coins/okodukai-coin-192.webp`;
  const logoSrc = `${assetBase}/assets/brand/logo-full-640.webp`;
  for (const img of stage.querySelectorAll("img.coin")) img.src = coinSrc;
  for (const img of stage.querySelectorAll("img.logo")) img.src = logoSrc;

  /** @type {Record<string, { duration: number; scenes: { sel: string; from: number; to: number }[] }>} */
  const VARIANTS = {
    story12: {
      duration: 12.5,
      scenes: [
        { sel: ".scene-hook", from: 0, to: 1.5 },
        { sel: ".scene-quests", from: 1.5, to: 3.5 },
        { sel: ".scene-validate", from: 3.5, to: 5.5 },
        { sel: ".scene-choice", from: 5.5, to: 8 },
        { sel: ".scene-montage", from: 8, to: 10.5 },
        { sel: ".scene-end", from: 10.5, to: 12.5 },
      ],
    },
    story6: {
      duration: 6,
      scenes: [
        { sel: ".scene-hook", from: 0, to: 1.5 },
        { sel: ".scene-quests", from: 1.5, to: 3 },
        { sel: ".scene-validate", from: 3, to: 4.5 },
        { sel: ".scene-short-end", from: 4.5, to: 6 },
      ],
    },
    landscape15: {
      duration: 15,
      scenes: [
        { sel: ".scene-hook", from: 0, to: 2 },
        { sel: ".scene-quests", from: 2, to: 4.2 },
        { sel: ".scene-validate", from: 4.2, to: 6.5 },
        { sel: ".scene-choice", from: 6.5, to: 9.2 },
        { sel: ".scene-montage", from: 9.2, to: 12.2 },
        { sel: ".scene-end", from: 12.2, to: 15 },
      ],
    },
  };

  const config = VARIANTS[variant] || VARIANTS.story12;
  const shortEnd = stage.querySelector(".scene-short-end");
  if (shortEnd) shortEnd.hidden = variant !== "story6";

  function seekTo(time) {
    const t = Math.max(0, Math.min(config.duration, time));
    for (const scene of config.scenes) {
      const el = stage.querySelector(scene.sel);
      if (!el) continue;
      const on = t >= scene.from && t < scene.to - 0.001;
      el.classList.toggle("is-active", on);
      if (scene.sel === ".scene-short-end") el.hidden = !on && variant === "story6" ? false : variant !== "story6";
      if (variant === "story6" && scene.sel === ".scene-short-end") el.hidden = false;
    }
    // Hide unused end on short
    const end = stage.querySelector(".scene-end");
    if (variant === "story6" && end) end.classList.remove("is-active");
    stage.dataset.t = String(t);
  }

  window.__okodukaiAd = {
    duration: config.duration,
    seekTo,
    variant,
    ratio,
  };

  seekTo(0);
})();
