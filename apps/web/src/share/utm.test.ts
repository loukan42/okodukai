import { describe, expect, it } from "vitest";
import { buildCampaignUrl, urlContainsPersonalData, isReferralUtm } from "./utm";
import { assertNoPersonalData, captionFor } from "./captions";
import { defaultFormatForViewport, detectShareCapabilities } from "./capabilities";

describe("buildCampaignUrl", () => {
  it("ajoute les UTM sans donnée personnelle", () => {
    const url = buildCampaignUrl({ source: "instagram" });
    expect(url).toContain("utm_source=instagram");
    expect(url).toContain("utm_medium=organic_share");
    expect(url).toContain("utm_campaign=parent_referral");
    expect(url).toContain("utm_content=video_v1");
    expect(urlContainsPersonalData(url)).toBe(false);
  });

  it("normalise une source inconnue", () => {
    const url = buildCampaignUrl({ source: "evil_source" });
    expect(url).toContain("utm_source=parent_share");
  });

  it("détecte les paramètres personnels interdits", () => {
    expect(urlContainsPersonalData("https://okodukai-gold.vercel.app/?childId=abc")).toBe(true);
    expect(urlContainsPersonalData("https://okodukai-gold.vercel.app/?utm_source=x")).toBe(false);
  });
});

describe("captions", () => {
  it("produit des textes sans e-mail ni identifiant", () => {
    const text = captionFor("whatsapp", "fr");
    expect(assertNoPersonalData(text)).toBe(true);
    expect(text.toLowerCase()).toContain("okodukai");
  });
});

describe("capabilities", () => {
  it("choisit Story sur écran étroit", () => {
    expect(defaultFormatForViewport(true)).toBe("story");
    expect(defaultFormatForViewport(false)).toBe("feed");
  });

  it("détecte l'absence de partage natif", () => {
    const caps = detectShareCapabilities({} as Navigator, 390);
    expect(caps.canShare).toBe(false);
    expect(caps.canShareFiles).toBe(false);
    expect(caps.isNarrow).toBe(true);
  });
});

describe("referral utm", () => {
  it("reconnaît une visite referral", () => {
    expect(isReferralUtm("?utm_campaign=parent_referral&utm_medium=organic_share")).toBe(true);
    expect(isReferralUtm("?utm_campaign=other")).toBe(false);
  });
});
