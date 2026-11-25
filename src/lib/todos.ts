import "server-only";

import { db, transaction } from "./db";
import type { Todo } from "./types";

/**
 * Accès aux tâches. Chaque fonction prend l'id de l'utilisateur issu de la session
 * (jamais du client) et filtre toujours par `user_id`.
 */

type Row = {
  id: string;
  text: string;
  done: number;
  created_at: number;
  date: string | null;
  deadline: string | null;
};

const toTodo = (r: Row): Todo => ({
  id: r.id,
  text: r.text,
  done: r.done === 1,
  createdAt: r.created_at,
  ...(r.date ? { date: r.date } : {}),
  ...(r.deadline ? { deadline: r.deadline } : {}),
});

/* ---------- Validation des données venant du client ---------- */

const ID_RE = /^[A-Za-z0-9-]{1,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEADLINE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const MAX_TEXT = 500;

export function cleanId(v: unknown): string | null {
  return typeof v === "string" && ID_RE.test(v) ? v : null;
}
export function cleanText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= MAX_TEXT ? t : null;
}
export function cleanDate(v: unknown): string | null {
  return typeof v === "string" && DATE_RE.test(v) ? v : null;
}
export function cleanDeadline(v: unknown): string | null {
  return typeof v === "string" && DEADLINE_RE.test(v) ? v : null;
}

/* ---------- Lecture ---------- */

export function listTodos(userId: string): Todo[] {
  const rows = db
    .prepare("SELECT id, text, done, created_at, date, deadline FROM todos WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Row[];
  return rows.map(toTodo);
}

/* ---------- Écriture ---------- */

export function insertTodo(userId: string, t: Todo) {
  db.prepare(
    "INSERT INTO todos (id, user_id, text, done, created_at, date, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(t.id, userId, t.text, t.done ? 1 : 0, t.createdAt, t.date ?? null, t.deadline ?? null);
}

export function updateTodo(
  userId: string,
  id: string,
  fields: { text?: string; done?: boolean; date?: string | null; deadline?: string | null },
) {
  const columns: [string, string | number | null][] = [];
  if (fields.text !== undefined) columns.push(["text", fields.text]);
  if (fields.done !== undefined) columns.push(["done", fields.done ? 1 : 0]);
  if (fields.date !== undefined) columns.push(["date", fields.date]);
  if (fields.deadline !== undefined) columns.push(["deadline", fields.deadline]);
  if (!columns.length) return;
  // Noms de colonnes fixes ci-dessus (jamais issus du client) ; les valeurs passent en paramètres
  const sets = columns.map(([col]) => `${col} = ?`);
  const values = columns.map(([, v]) => v);
  db.prepare(`UPDATE todos SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).run(...values, id, userId);
}

export function deleteTodo(userId: string, id: string) {
  db.prepare("DELETE FROM todos WHERE id = ? AND user_id = ?").run(id, userId);
}

export function deleteCompleted(userId: string) {
  db.prepare("DELETE FROM todos WHERE user_id = ? AND done = 1").run(userId);
}

export function setAllDone(userId: string, done: boolean) {
  db.prepare("UPDATE todos SET done = ? WHERE user_id = ?").run(done ? 1 : 0, userId);
}

/** Importe des tâches (ex. depuis le localStorage). Les id déjà présents sont ignorés. */
export function importTodos(userId: string, todos: Todo[]) {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO todos (id, user_id, text, done, created_at, date, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  transaction(() => {
    for (const t of todos) {
      stmt.run(t.id, userId, t.text, t.done ? 1 : 0, t.createdAt, t.date ?? null, t.deadline ?? null);
    }
  });
}
