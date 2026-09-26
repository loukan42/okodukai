// Palette du monde — source unique, alignée sur docs/ART_BIBLE.md §5-6.
// Chaque matière : light (face éclairée, lumière en haut à gauche), base, shade (flanc droit), deep (creux).

export const ink = { night: "#172941", slate: "#243d55", deep: "#10203a" };
export const shadowCool = "#3b4f78";

export const wood = { light: "#c48a55", base: "#8f5d3b", shade: "#63402a", deep: "#3f2618", grain: "#744a2f" };
export const woodDark = { light: "#8b5a3a", base: "#6a4128", shade: "#4a2b1a", deep: "#2c190f" };
export const stone = { light: "#dcd2bc", base: "#b3a893", shade: "#7f7461", deep: "#5d5446", moss: "#6f9a5c" };
export const gold = { hi: "#fff3c4", light: "#f7dd8a", base: "#e0ae45", shade: "#b27623", deep: "#7e4d14" };
export const iron = { light: "#8a95a8", base: "#56627a", shade: "#343d52" };
export const cloth = {
  vermilion: { light: "#df7358", base: "#c8553f", shade: "#98392a" },
  indigo: { light: "#3f6490", base: "#2e4a6b", shade: "#1f334d" },
  cream: { light: "#fbf1da", base: "#f1e3c4", shade: "#d3bf98" },
  teal: { light: "#5f9c96", base: "#3f7f7a", shade: "#2b5d59" },
};
export const leather = { light: "#c47d4c", base: "#9c5b34", shade: "#64371e" };
export const paper = { light: "#fffaf0", base: "#f6f0df", shade: "#d8c9a7" };
export const lantern = { core: "#fff4d4", light: "#ffd58a", base: "#f0a64a", glow: "#ffcf7a" };

export const foliage = {
  far: { light: "#9fbf98", base: "#86a887", shade: "#6d8f78" },
  mid: { light: "#8fbf6f", base: "#5f9a62", shade: "#3f7556" },
  near: { light: "#9cc77a", base: "#4f8a5c", shade: "#2f6147" },
  ginkgo: { light: "#f6d77a", base: "#e2b04a", shade: "#b98a2e" },
  maple: { light: "#e0795a", base: "#c65a3e", shade: "#94402c" },
  pine: { light: "#5c8f6a", base: "#3d6f55", shade: "#2a5140" },
};

export const grass = { hi: "#b9d88a", light: "#8fc070", base: "#5c9a5e", shade: "#3f7751", deep: "#2c5a42" };
export const water = { light: "#d9eeea", base: "#7fb2c0", shade: "#5a8ea3" };

// Ciels — ambiance « fin d'après-midi » (par défaut) et « crépuscule des lanternes ».
export const skies = {
  golden: {
    top: "#8fbccb",
    mid: "#d9dcc0",
    low: "#f6d9a6",
    horizon: "#f7c68d",
    sun: "#fff6dc",
    haze: "#f9e4bf",
    far1: "#a7bfc4",
    far2: "#93b0b6",
    mist: "#f4e2c4",
    cloudLight: "#fff8ea",
    cloudShade: "#e9d2b4",
  },
  dusk: {
    top: "#1c3152",
    mid: "#4a5a86",
    low: "#c9899a",
    horizon: "#f2b48a",
    sun: "#ffe2b8",
    haze: "#f0b894",
    far1: "#5f6f98",
    far2: "#4d5d86",
    mist: "#b98ca0",
    cloudLight: "#e3b3a1",
    cloudShade: "#6f678c",
  },
};
