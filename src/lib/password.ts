import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pwd: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEYLEN = 64;

/** Hash au format `scrypt$<sel>$<hash>` (base64url). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scryptAsync(password.normalize("NFKC"), Buffer.from(saltB64, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash factice pour garder un temps de réponse constant quand l'email n'existe pas. */
export const DUMMY_HASH =
  "scrypt$AAAAAAAAAAAAAAAAAAAAAA$" + Buffer.alloc(KEYLEN).toString("base64url");
