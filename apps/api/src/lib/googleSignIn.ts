import { OAuth2Client } from "google-auth-library";

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

let verifier: OAuth2Client | null = null;
let verifierClientId: string | null = null;

/** Le client ID public doit être le même dans l'API et le bouton du navigateur. */
export function googleClientId(): string | null {
  return process.env.GOOGLE_CLIENT_ID?.trim() || null;
}

/** Vérifie signature, audience, émetteur et expiration avec la bibliothèque Google. */
export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity | null> {
  const clientId = googleClientId();
  if (!clientId) return null;
  try {
    if (!verifier || verifierClientId !== clientId) {
      verifier = new OAuth2Client(clientId);
      verifierClientId = clientId;
    }
    const ticket = await verifier.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) return null;
    const email = payload.email.trim().toLowerCase();
    if (email.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
    const name = (payload.name || payload.given_name || email.split("@")[0]).trim().slice(0, 80) || "Parent";
    return {
      sub: payload.sub,
      email,
      name,
    };
  } catch {
    return null;
  }
}
