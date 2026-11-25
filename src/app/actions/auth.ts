"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";

export type AuthState =
  | {
      error?: string;
      fieldErrors?: { name?: string; email?: string; password?: string };
      values?: { name?: string; email?: string };
    }
  | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function read(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = read(formData, "name").trim();
  const email = read(formData, "email").trim().toLowerCase();
  const password = read(formData, "password");

  const fieldErrors: NonNullable<AuthState>["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Indiquez votre prénom.";
  else if (name.length > 60) fieldErrors.name = "60 caractères maximum.";
  if (!EMAIL_RE.test(email) || email.length > 254) fieldErrors.email = "Adresse email invalide.";
  if (password.length < 8) fieldErrors.password = "8 caractères minimum.";
  else if (password.length > 200) fieldErrors.password = "200 caractères maximum.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values: { name, email } };

  const exists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(email);
  if (exists) {
    return { fieldErrors: { email: "Un compte existe déjà avec cet email." }, values: { name, email } };
  }

  const id = randomUUID();
  db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    email,
    name,
    await hashPassword(password),
    Date.now(),
  );
  await createSession(id);
  redirect("/");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = read(formData, "email").trim().toLowerCase();
  const password = read(formData, "password");

  const user = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
    | { id: string; password_hash: string }
    | undefined;
  // On vérifie toujours un hash, même si l'email est inconnu, pour ne pas révéler quels comptes existent
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    return { error: "Email ou mot de passe incorrect.", values: { email } };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
