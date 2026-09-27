import { afterEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.hoisted(() => vi.fn());
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken;
  },
}));

import { verifyGoogleCredential } from "./googleSignIn.js";

const originalClientId = process.env.GOOGLE_CLIENT_ID;
afterEach(() => {
  if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = originalClientId;
  verifyIdToken.mockReset();
});

describe("vérification du jeton Google", () => {
  it("vérifie l'audience configurée et exige une adresse vérifiée", async () => {
    process.env.GOOGLE_CLIENT_ID = "client-test";
    verifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ sub: "google-123", email: "Parent@Gmail.com", email_verified: true, name: " Parent " }) });
    expect(await verifyGoogleCredential("jeton")).toEqual({ sub: "google-123", email: "parent@gmail.com", name: "Parent" });
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: "jeton", audience: "client-test" });

    verifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ sub: "google-123", email: "parent@gmail.com", email_verified: false }) });
    expect(await verifyGoogleCredential("jeton-invalide")).toBeNull();
  });
});
