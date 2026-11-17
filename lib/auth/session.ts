export const SESSION_COOKIE = "site_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90;

const SESSION_LABEL = "repohistory-session";
const encoder = new TextEncoder();

async function sha256(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
}

function equalBytes(a: Uint8Array, b: Uint8Array) {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function verifyToken(provided: string, expected: string) {
  if (!expected) return false;
  const [providedHash, expectedHash] = await Promise.all([
    sha256(provided),
    sha256(expected),
  ]);
  return equalBytes(providedHash, expectedHash);
}

export async function sessionValue(siteToken: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(siteToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(SESSION_LABEL),
  );
  return toHex(new Uint8Array(signature));
}

export async function isValidSession(
  cookie: string | undefined,
  siteToken: string,
) {
  if (!cookie || !siteToken) return false;
  return verifyToken(cookie, await sessionValue(siteToken));
}
