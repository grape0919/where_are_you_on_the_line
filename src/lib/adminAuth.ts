export const ADMIN_COOKIE_NAME = "admin_session";

const TOKEN_SEPARATOR = ".";
const DEFAULT_TTL_SECONDS = 12 * 60 * 60;

function bytesToBinaryString(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]!);
  }
  return out;
}

function binaryStringToBytes(binary: string): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(bytesToBinaryString(bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(base64Url.length / 4) * 4,
    "="
  );
  return binaryStringToBytes(atob(padded));
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

function getNowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function buildPayload(ttlSeconds: number): string {
  const iat = getNowSeconds();
  const exp = iat + ttlSeconds;
  return JSON.stringify({ iat, exp });
}

export async function createAdminSessionValue(
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string> {
  const payload = buildPayload(ttlSeconds);
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  const sig = await hmacSha256(secret, payloadB64);
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}${TOKEN_SEPARATOR}${sigB64}`;
}

export async function verifyAdminSessionValue(
  value: string | undefined,
  secret: string
): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(TOKEN_SEPARATOR);
  if (parts.length !== 2) return false;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return false;

  let payloadJson = "";
  try {
    payloadJson = new TextDecoder().decode(base64UrlDecodeToBytes(payloadB64));
  } catch {
    return false;
  }

  let payload: { exp?: number } | null = null;
  try {
    payload = JSON.parse(payloadJson) as { exp?: number };
  } catch {
    return false;
  }

  if (!payload?.exp || typeof payload.exp !== "number") return false;
  if (payload.exp <= getNowSeconds()) return false;

  const expectedSig = await hmacSha256(secret, payloadB64);
  let providedSig: Uint8Array;
  try {
    providedSig = base64UrlDecodeToBytes(sigB64);
  } catch {
    return false;
  }

  return timingSafeEqualBytes(expectedSig, providedSig);
}


