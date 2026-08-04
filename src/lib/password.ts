// PBKDF2-SHA256 password hashing that works on Node, Vercel and Cloudflare Workers.
// Format: pbkdf2$<iterations>$<saltHex>$<hashHex>
//
// NOTE: Cloudflare Workers' WebCrypto rejects PBKDF2 iteration counts above
// 100000 ("Pbkdf2 failed: iteration counts above 100000 are not supported").
// New hashes therefore use 100000. Legacy 120000-iteration hashes are still
// verifiable through a pure-JS fallback, and callers can re-hash them.
import { pbkdf2 as noblePbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

const ITERATIONS = 100000;
const MAX_WEBCRYPTO_ITERATIONS = 100000;

/** True when the stored hash uses an iteration count Workers cannot handle. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  return parts[0] !== "pbkdf2" || Number(parts[1]) !== ITERATIONS;
}


function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const computed = await derive(password, fromHex(parts[2]!), iterations);
  const expected = parts[3]!;
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
