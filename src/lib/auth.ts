import crypto from "crypto";
import { cookies } from "next/headers";
import { ADMIN_CREDENTIALS } from "./constants";

export const SESSION_COOKIE_NAME = "nikkou_ea_session";
const SECRET = process.env.AUTH_SECRET || "nikkou_centre_employment_accounts_secret_key_2026";

export function createSessionToken(username: string): string {
  const payload = JSON.stringify({
    username,
    role: "admin",
    iat: Date.now(),
  });
  const base64Payload = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(base64Payload)
    .digest("base64url");
  return `${base64Payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): { username: string; role: string } | null {
  if (!token || !token.includes(".")) return null;
  const [base64Payload, signature] = token.split(".");
  if (!base64Payload || !signature) return null;

  const expectedSig = crypto
    .createHmac("sha256", SECRET)
    .update(base64Payload)
    .digest("base64url");

  if (signature !== expectedSig) return null;

  try {
    const decoded = JSON.parse(Buffer.from(base64Payload, "base64url").toString("utf-8"));
    if (decoded.username === ADMIN_CREDENTIALS.username) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<{ username: string; role: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
