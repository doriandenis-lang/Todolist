import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { db } from "./db";

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;

export type User = { id: string; email: string; name: string };

/** Seul le hash du jeton est stocké en base : une fuite de la base ne donne pas de sessions valides. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DAYS * DAY_MS;
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    userId,
    expiresAt,
  );
  // Ménage des sessions expirées
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** Utilisateur connecté, ou `null`. Vérifie la session en base à chaque appel. */
export async function getCurrentUser(): Promise<User | null> {
  // Lecture à la requête (base SQLite synchrone + heure courante) : jamais pré-rendue
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), Date.now()) as User | undefined;
  return row ? { id: row.id, email: row.email, name: row.name } : null;
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  store.delete(SESSION_COOKIE);
}
