"use server";

import { getCurrentUser } from "@/lib/session";
import * as repo from "@/lib/todos";
import type { Todo } from "@/lib/types";

/**
 * Actions serveur appelées par l'interface. Chacune revérifie la session :
 * l'identité vient du cookie, jamais des arguments envoyés par le navigateur.
 */

async function requireUserId() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Session expirée, reconnectez-vous.");
  return user.id;
}

function parseTodo(input: unknown): Todo | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const id = repo.cleanId(o.id);
  const text = repo.cleanText(o.text);
  if (!id || !text) return null;
  const createdAt = typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  const date = repo.cleanDate(o.date);
  const deadline = repo.cleanDeadline(o.deadline);
  return {
    id,
    text,
    done: o.done === true,
    createdAt,
    ...(date ? { date } : {}),
    ...(deadline ? { deadline } : {}),
  };
}

export async function addTodoAction(input: unknown) {
  const userId = await requireUserId();
  const todo = parseTodo(input);
  if (!todo) throw new Error("Tâche invalide.");
  repo.insertTodo(userId, todo);
}

export async function setDoneAction(id: unknown, done: unknown) {
  const userId = await requireUserId();
  const cleanId = repo.cleanId(id);
  if (!cleanId) throw new Error("Tâche invalide.");
  repo.updateTodo(userId, cleanId, { done: done === true });
}

export async function editTodoAction(id: unknown, fields: unknown) {
  const userId = await requireUserId();
  const cleanId = repo.cleanId(id);
  const f = (fields ?? {}) as Record<string, unknown>;
  const text = repo.cleanText(f.text);
  if (!cleanId || !text) throw new Error("Tâche invalide.");
  repo.updateTodo(userId, cleanId, {
    text,
    date: repo.cleanDate(f.date),
    deadline: repo.cleanDeadline(f.deadline),
  });
}

export async function deleteTodoAction(id: unknown) {
  const userId = await requireUserId();
  const cleanId = repo.cleanId(id);
  if (!cleanId) throw new Error("Tâche invalide.");
  repo.deleteTodo(userId, cleanId);
}

export async function clearCompletedAction() {
  repo.deleteCompleted(await requireUserId());
}

export async function setAllDoneAction(done: unknown) {
  repo.setAllDone(await requireUserId(), done === true);
}

/** Importe les tâches du navigateur puis renvoie la liste complète du compte. */
export async function importLocalTodosAction(input: unknown): Promise<Todo[]> {
  const userId = await requireUserId();
  const list = Array.isArray(input) ? input.slice(0, 1000) : [];
  const todos = list.map(parseTodo).filter((t): t is Todo => t !== null);
  if (todos.length) repo.importTodos(userId, todos);
  return repo.listTodos(userId);
}
