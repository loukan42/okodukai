(() => {
  const stage = document.getElementById("stage");
  const params = new URLSearchParams(location.search);
  const variant = params.get("variant") || "story12";
  const ratio = params.get("ratio") || "9x16";
  const assetBase = (params.get("assets") || "").replace(/\/$/, "");

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

  const path = (rel) => `${assetBase}${rel}`;

  const bgA = document.getElementById("bg-a");
  const bgB = document.getElementById("bg-b");
  const wide = ratio === "16x9" || ratio === "1x1";
  bgA.src = path(wide ? "/assets/backgrounds/valley-golden-wide-1920.webp" : "/assets/backgrounds/valley-golden-tall-1080.webp");
  bgB.src = path(wide ? "/assets/backgrounds/valley-hamlet-dawn-wide-1920.webp" : "/assets/backgrounds/valley-hamlet-dawn-tall-1080.webp");

  const bind = (sel, src) => {
    for (const el of stage.querySelectorAll(sel)) el.src = path(src);
  };
  bind(".asset-logo-sm", "/assets/brand/logo-full-320.webp");
  bind(".asset-logo-lg", "/assets/brand/logo-full-640.webp");
  bind(".asset-avatar", "/assets/avatars/aventurier-06-192.webp");
  bind(".quest-art", "/assets/quests/quest-home-360.webp");
  bind(".asset-board", "/assets/quests/quest-board-540.webp");
  bind(".asset-coin", "/assets/coins/okodukai-coin-192.webp");
  bind(".asset-chest", "/assets/savings/savings-chest-full-480.webp");
  bind(".asset-shop", "/assets/shop/shop-stall-360.webp");
  bind(".asset-scope", "/assets/objects/telescope-256.webp");
  bind(".asset-reward", "/assets/rewards/reward-icecream-256.webp");
  bind(".asset-booster", "/assets/objects/quest-scroll-256.webp");

  // Fallbacks if some reward/shop names differ
  for (const img of stage.querySelectorAll("img")) {
    img.addEventListener("error", () => {
      if (img.classList.contains("asset-reward")) img.src = path("/assets/quests/quest-home-360.webp");
      if (img.classList.contains("asset-shop")) img.src = path("/assets/objects/coin-sprout-256.webp");
      if (img.classList.contains("asset-booster")) img.src = path("/assets/quests/quest-board-360.webp");
      if (img.classList.contains("asset-scope")) img.src = path("/assets/objects/telescope-256.webp");
      if (img.classList.contains("asset-avatar")) img.src = path("/assets/coins/okodukai-coin-192.webp");
    });
  }

  const VARIANTS = {
    story12: {
      duration: 12.5,
      scenes: [
        { id: "hook", from: 0, to: 1.5, bg: "a" },
        { id: "quest", from: 1.5, to: 3.5, bg: "a" },
        { id: "validate", from: 3.5, to: 5.5, bg: "a" },
        { id: "choice", from: 5.5, to: 8, bg: "a" },
        { id: "montage", from: 8, to: 10.5, bg: "b" },
        { id: "end", from: 10.5, to: 12.5, bg: "b" },
      ],
    },
    story6: {
      duration: 6,
      scenes: [
        { id: "hook", from: 0, to: 1.5, bg: "a" },
        { id: "quest", from: 1.5, to: 3, bg: "a" },
        { id: "validate", from: 3, to: 4.5, bg: "a" },
        { id: "short-end", from: 4.5, to: 6, bg: "b" },
      ],
    },
    landscape15: {
      duration: 15,
      scenes: [
        { id: "hook", from: 0, to: 2, bg: "a" },
        { id: "quest", from: 2, to: 4.2, bg: "a" },
        { id: "validate", from: 4.2, to: 6.5, bg: "a" },
        { id: "choice", from: 6.5, to: 9.2, bg: "a" },
        { id: "montage", from: 9.2, to: 12.2, bg: "b" },
        { id: "end", from: 12.2, to: 15, bg: "b" },
      ],
    },
  };

  const config = VARIANTS[variant] || VARIANTS.story12;
  const scenes = [...stage.querySelectorAll(".scene")];

  function setBg(which) {
    bgA.classList.toggle("is-on", which === "a");
    bgB.classList.toggle("is-on", which === "b");
  }

  function seekTo(time) {
    const t = Math.max(0, Math.min(config.duration, time));
    let active = config.scenes[0];
    for (const scene of config.scenes) {
      if (t >= scene.from && t < scene.to - 0.001) active = scene;
    }
    // last frame sticks on last scene
    if (t >= config.duration - 0.02) active = config.scenes[config.scenes.length - 1];

    for (const el of scenes) {
      const on = el.dataset.id === active.id;
      el.classList.toggle("is-active", on);
    }
    setBg(active.bg);
    stage.dataset.t = String(t);
  }

  window.__okodukaiAd = {
    duration: config.duration,
    seekTo,
    variant,
    ratio,
    ready: false,
  };

  Promise.all(
    [...stage.querySelectorAll("img")].map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
    ),
  ).then(() => {
    window.__okodukaiAd.ready = true;
    seekTo(0);
  });

  seekTo(0);
})();
