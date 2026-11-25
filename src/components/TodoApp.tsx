"use client";

import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import {
  addTodoAction,
  clearCompletedAction,
  deleteTodoAction,
  editTodoAction,
  importLocalTodosAction,
  setAllDoneAction,
  setDoneAction,
} from "@/app/actions/todos";
import type { PublicUser, Todo } from "@/lib/types";

type Filter = "toutes" | "actives" | "terminées" | "en retard";
type Sort = "ajout" | "échéance";

type Draft = { id: string; text: string; date: string; deadline: string };

/** Ancienne sauvegarde dans le navigateur (avant les comptes), importée au premier chargement */
const LEGACY_STORAGE_KEY = "todo-list:v1";
const FILTERS: Filter[] = ["toutes", "actives", "terminées", "en retard"];
const DAY = 86_400_000;

function readLegacyTodos(): unknown[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ---------- Dates ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
const toDayInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parseDay(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayDiff(d: Date, now: Date) {
  return Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);
}

const fmtDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtFull = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" });

function dayLabel(d: Date, now: Date) {
  const diff = dayDiff(d, now);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return "demain";
  if (diff === -1) return "hier";
  return fmtDay.format(d);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function relative(ms: number) {
  const min = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  const txt =
    min < 60 ? `${min} min` : min < 60 * 24 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} j`;
  return ms < 0 ? `en retard de ${txt}` : `dans ${txt}`;
}

type DeadlineStatus = "overdue" | "soon" | "later";

function deadlineStatus(deadline: string, now: Date): DeadlineStatus {
  const ms = new Date(deadline).getTime() - now.getTime();
  return ms < 0 ? "overdue" : ms < DAY ? "soon" : "later";
}

function isOverdue(t: Todo, now: Date) {
  return !t.done && !!t.deadline && deadlineStatus(t.deadline, now) === "overdue";
}

/** Clé de tri : échéance, sinon fin de la date prévue, sinon à la fin */
function sortKey(t: Todo) {
  if (t.deadline) return new Date(t.deadline).getTime();
  if (t.date) return parseDay(t.date).getTime() + DAY - 1;
  return Infinity;
}

/* ---------- Icônes (trait 1.75, style unique) ---------- */

type IconProps = { className?: string };
const iconBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function CalendarIcon({ className = "h-3.5 w-3.5 shrink-0" }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function ClockIcon({ className = "h-3.5 w-3.5 shrink-0" }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function PlusIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...iconBase} className={className} strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

function CheckAllIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M2 12l5 5L18 6M12 16l1 1 9-11" />
    </svg>
  );
}

function LogoutIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10" />
    </svg>
  );
}

function SortIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
    </svg>
  );
}

function SparkleIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z" />
    </svg>
  );
}

/* ---------- Petits éléments partagés ---------- */

const fieldClass =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 text-zinc-600 transition-colors duration-150 ease-out-soft hover:border-zinc-300 focus-within:border-indigo-500 focus-within:ring-3 focus-within:ring-indigo-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:focus-within:ring-indigo-500/20";
const dateInputClass =
  "bg-transparent text-sm tabular-nums outline-none [color-scheme:light] dark:[color-scheme:dark]";
const ghostButton =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors duration-150 ease-out-soft hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
const primaryButton =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white shadow-sm transition-colors duration-150 ease-out-soft hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500";

function ClearButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="-mr-1 grid h-5 w-5 place-content-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
    >
      <svg {...iconBase} className="h-3 w-3" strokeWidth={2}>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

const FILTER_LABELS: Record<Filter, string> = {
  toutes: "Toutes",
  actives: "À faire",
  terminées: "Terminées",
  "en retard": "En retard",
};

const fmtToday = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/* ---------- Application ---------- */

export default function TodoApp({ user, initialTodos }: { user: PublicUser; initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [date, setDate] = useState("");
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [filter, setFilter] = useState<Filter>("toutes");
  const [sort, setSort] = useState<Sort>("ajout");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [now, setNow] = useState(() => new Date());
  const editRef = useRef<HTMLInputElement>(null);

  /** L'interface est mise à jour tout de suite ; la base est enregistrée en arrière-plan. */
  function persist(promise: Promise<unknown>) {
    promise.catch((err: unknown) => {
      setSyncError(
        err instanceof Error && err.message
          ? err.message
          : "Impossible d'enregistrer la dernière modification.",
      );
    });
  }

  // Import unique des tâches enregistrées dans ce navigateur avant la création des comptes
  const importStarted = useRef(false);
  useEffect(() => {
    if (importStarted.current) return;
    importStarted.current = true;
    const legacy = readLegacyTodos();
    if (!legacy.length) return;
    importLocalTodosAction(legacy)
      .then((all) => {
        setTodos(all);
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          /* stockage indisponible : on ignore */
        }
        setNotice(
          `${legacy.length} tâche${legacy.length > 1 ? "s" : ""} de ce navigateur ${
            legacy.length > 1 ? "ont été importées" : "a été importée"
          } dans votre compte.`,
        );
      })
      .catch(() => setSyncError("L'import des tâches de ce navigateur a échoué. Rechargez la page pour réessayer."));
  }, []);

  // Met à jour l'heure courante pour les comptes à rebours
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const editingId = draft?.id;
  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  function toggleDeadline(on: boolean) {
    setHasDeadline(on);
    // Propose par défaut 18h00 le jour prévu (ou aujourd'hui)
    if (on && !deadline) setDeadline(`${date || toDayInput(new Date())}T18:00`);
  }

  function addTodo(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      done: false,
      createdAt: Date.now(),
      ...(date ? { date } : {}),
      ...(hasDeadline && deadline ? { deadline } : {}),
    };
    setTodos((prev) => [todo, ...prev]);
    persist(addTodoAction(todo));
    setInput("");
    setDate("");
    setHasDeadline(false);
    setDeadline("");
  }

  function toggleTodo(id: string) {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !target.done } : t)));
    persist(setDoneAction(id, !target.done));
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    persist(deleteTodoAction(id));
  }

  function startEdit(todo: Todo) {
    setDraft({ id: todo.id, text: todo.text, date: todo.date ?? "", deadline: todo.deadline ?? "" });
  }

  function saveEdit() {
    if (!draft) return;
    const text = draft.text.trim();
    if (!text) {
      // Texte vidé : on supprime la tâche
      deleteTodo(draft.id);
    } else {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === draft.id
            ? { ...t, text, date: draft.date || undefined, deadline: draft.deadline || undefined }
            : t,
        ),
      );
      persist(editTodoAction(draft.id, { text, date: draft.date, deadline: draft.deadline }));
    }
    setDraft(null);
  }

  function clearCompleted() {
    setTodos((prev) => prev.filter((t) => !t.done));
    persist(clearCompletedAction());
  }

  function toggleAll() {
    const allDone = todos.every((t) => t.done);
    setTodos((prev) => prev.map((t) => ({ ...t, done: !allDone })));
    persist(setAllDoneAction(!allDone));
  }

  const filtered = todos.filter((t) =>
    filter === "actives"
      ? !t.done
      : filter === "terminées"
        ? t.done
        : filter === "en retard"
          ? isOverdue(t, now)
          : true,
  );
  const visible =
    sort === "échéance"
      ? [...filtered].sort(
          (a, b) => Number(a.done) - Number(b.done) || sortKey(a) - sortKey(b) || b.createdAt - a.createdAt,
        )
      : filtered;
  const remaining = todos.filter((t) => !t.done).length;
  const completed = todos.length - remaining;
  const overdue = todos.filter((t) => isOverdue(t, now)).length;
  const counts: Record<Filter, number> = {
    toutes: todos.length,
    actives: remaining,
    terminées: completed,
    "en retard": overdue,
  };
  const progress = todos.length ? Math.round((completed / todos.length) * 100) : 0;

  return (
    <div className="w-full max-w-xl">
      {/* ----- Compte ----- */}
      <div className="mb-6 flex items-center justify-end gap-2">
        <div className="flex min-w-0 items-center gap-2" title={user.email}>
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-content-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">{user.name}</span>
        </div>
        <form action={logoutAction}>
          <button type="submit" className={ghostButton}>
            <LogoutIcon />
            <span className="hidden sm:inline">Se déconnecter</span>
            <span className="sr-only sm:hidden">Se déconnecter</span>
          </button>
        </form>
      </div>

      {syncError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20"
        >
          <p className="flex-1">{syncError}</p>
          <button
            onClick={() => location.reload()}
            className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
          >
            Recharger
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800 ring-1 ring-inset ring-indigo-600/10 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-400/20"
        >
          <p className="flex-1">{notice}</p>
          <button
            onClick={() => setNotice(null)}
            aria-label="Fermer"
            className="grid h-5 w-5 shrink-0 place-content-center rounded text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
          >
            <svg {...iconBase} className="h-3.5 w-3.5" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      {/* ----- En-tête ----- */}
      <header className="mb-8 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascotte.png"
          alt="Grenouille à lunettes avec un crayon"
          width={175}
          height={126}
          className="h-14 w-14 shrink-0 rounded-2xl border border-zinc-200 bg-white object-contain p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:h-16 sm:w-16"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Ma todo-list
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{capitalize(fmtToday.format(now))}</p>
        </div>
        {todos.length > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {completed}/{todos.length}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">terminées</p>
          </div>
        )}
      </header>

      {todos.length > 0 && (
        <div
          className="-mt-4 mb-8 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression"
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-[width] duration-500 ease-out-soft dark:bg-indigo-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* ----- Ajout ----- */}
      <form
        onSubmit={addTodo}
        className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition-shadow duration-200 ease-out-soft focus-within:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center gap-2">
          <label htmlFor="new-todo" className="sr-only">
            Nouvelle tâche
          </label>
          <input
            id="new-todo"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Qu'y a-t-il à faire ?"
            className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            autoFocus
          />
          <button type="submit" disabled={!input.trim()} className={`${primaryButton} h-10 px-4`}>
            <PlusIcon />
            <span className="hidden sm:inline">Ajouter</span>
            <span className="sr-only sm:hidden">Ajouter</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-1 pb-1 pt-2 text-sm dark:border-zinc-800">
          <label className={fieldClass} title="Date prévue">
            <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="sr-only">Date prévue</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={dateInputClass}
            />
            {date && <ClearButton onClick={() => setDate("")} label="Retirer la date" />}
          </label>

          <button
            type="button"
            onClick={() => toggleDeadline(!hasDeadline)}
            aria-pressed={hasDeadline}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors duration-150 ease-out-soft ${
              hasDeadline
                ? "border-indigo-200 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                : "border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <ClockIcon className="h-4 w-4 shrink-0" />
            Deadline
          </button>

          {hasDeadline && (
            <label className={fieldClass} title="Échéance">
              <span className="sr-only">Échéance</span>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={dateInputClass}
              />
            </label>
          )}
        </div>
      </form>

      {/* ----- Barre d'outils ----- */}
      {todos.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filtrer les tâches"
            className="flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none] rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
          >
            {FILTERS.map((f) => {
              const active = filter === f;
              const isLate = f === "en retard" && counts[f] > 0;
              return (
                <button
                  key={f}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f)}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors duration-150 ease-out-soft ${
                    active
                      ? "bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  {FILTER_LABELS[f]}
                  <span
                    className={`rounded-md px-1.5 text-xs tabular-nums ${
                      isLate
                        ? "bg-red-100 font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {counts[f]}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400" title="Trier">
            <SortIcon />
            <span className="sr-only">Trier par</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-700 outline-none transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:[color-scheme:dark]"
            >
              <option value="ajout">Ajout</option>
              <option value="échéance">Échéance</option>
            </select>
          </label>
        </div>
      )}

      {/* ----- Liste ----- */}
      <section
        className={`overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
          todos.length > 0 ? "mt-3" : "mt-8"
        }`}
      >
        {visible.length > 0 ? (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.map((todo) =>
              draft?.id === todo.id ? (
                <li key={todo.id} className="space-y-3 bg-zinc-50 p-4 dark:bg-zinc-950/40">
                  <input
                    ref={editRef}
                    value={draft.text}
                    onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setDraft(null);
                    }}
                    aria-label="Modifier la tâche"
                    className="h-10 w-full rounded-lg border border-indigo-500 bg-white px-3 text-zinc-900 outline-none ring-3 ring-indigo-100 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-indigo-500/20"
                  />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <label className={fieldClass} title="Date prévue">
                      <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                        aria-label="Date prévue"
                        className={dateInputClass}
                      />
                      {draft.date && (
                        <ClearButton onClick={() => setDraft({ ...draft, date: "" })} label="Retirer la date" />
                      )}
                    </label>
                    <label className={fieldClass} title="Deadline">
                      <ClockIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                      <input
                        type="datetime-local"
                        value={draft.deadline}
                        onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                        aria-label="Deadline"
                        className={dateInputClass}
                      />
                      {draft.deadline && (
                        <ClearButton
                          onClick={() => setDraft({ ...draft, deadline: "" })}
                          label="Retirer la deadline"
                        />
                      )}
                    </label>
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => setDraft(null)} className={ghostButton}>
                        Annuler
                      </button>
                      <button onClick={saveEdit} className={primaryButton}>
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </li>
              ) : (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  now={now}
                  onToggle={() => toggleTodo(todo.id)}
                  onEdit={() => startEdit(todo)}
                  onDelete={() => deleteTodo(todo.id)}
                />
              ),
            )}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 grid h-12 w-12 place-content-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <SparkleIcon />
            </div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {todos.length === 0
                ? "Rien à faire pour l'instant"
                : filter === "en retard"
                  ? "Rien en retard, bravo !"
                  : filter === "terminées"
                    ? "Aucune tâche terminée"
                    : "Tout est fait !"}
            </p>
            <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              {todos.length === 0
                ? "Ajoutez votre première tâche dans le champ ci-dessus."
                : "Aucune tâche ne correspond à ce filtre."}
            </p>
            {todos.length > 0 && filter !== "toutes" && (
              <button onClick={() => setFilter("toutes")} className={`${ghostButton} mt-4 text-indigo-600 dark:text-indigo-300`}>
                Voir toutes les tâches
              </button>
            )}
          </div>
        )}

        {/* ----- Pied ----- */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/60 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-950/30">
            <button onClick={toggleAll} className={ghostButton}>
              <CheckAllIcon />
              {todos.every((t) => t.done) ? "Tout décocher" : "Tout cocher"}
            </button>
            <button
              onClick={clearCompleted}
              disabled={completed === 0}
              className={`${ghostButton} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400`}
            >
              <TrashIcon />
              Effacer terminées
            </button>
          </div>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
        Double-cliquez sur une tâche pour la modifier · Enregistré dans votre compte
      </p>
    </div>
  );
}

/* ---------- Ligne de tâche ---------- */

const statusClass: Record<DeadlineStatus, string> = {
  overdue: "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20",
  soon: "bg-amber-50 text-amber-800 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  later: "bg-zinc-50 text-zinc-600 ring-zinc-900/5 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/5",
};

function TodoRow({
  todo,
  now,
  onToggle,
  onEdit,
  onDelete,
}: {
  todo: Todo;
  now: Date;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = todo.deadline ? deadlineStatus(todo.deadline, now) : null;
  const deadlineDate = todo.deadline ? new Date(todo.deadline) : null;
  const chip = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ring-1 ring-inset";

  return (
    <li className="group flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 ease-out-soft hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={onToggle}
        aria-label={`Marquer « ${todo.text} » comme ${todo.done ? "à faire" : "terminée"}`}
        className="todo-check mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <span
          onDoubleClick={onEdit}
          title="Double-cliquez pour modifier"
          className={`block cursor-text break-words leading-6 transition-colors duration-150 ${
            todo.done
              ? "text-zinc-400 line-through decoration-zinc-300 dark:text-zinc-500 dark:decoration-zinc-600"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {todo.text}
        </span>

        {(todo.date || deadlineDate) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            {todo.date && (
              <span
                title={`Prévue le ${fmtFull.format(parseDay(todo.date)).split(" à ")[0]}`}
                className={`${chip} ${
                  todo.done
                    ? "text-zinc-400 ring-zinc-900/5 dark:text-zinc-500 dark:ring-white/5"
                    : "bg-zinc-50 text-zinc-600 ring-zinc-900/5 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/5"
                }`}
              >
                <CalendarIcon />
                {capitalize(dayLabel(parseDay(todo.date), now))}
              </span>
            )}
            {deadlineDate && status && (
              <span
                title={`Deadline : ${fmtFull.format(deadlineDate)}`}
                className={`${chip} tabular-nums ${
                  todo.done ? "text-zinc-400 ring-zinc-900/5 dark:text-zinc-500 dark:ring-white/5" : statusClass[status]
                }`}
              >
                <ClockIcon />
                {capitalize(dayLabel(deadlineDate, now))} à {fmtTime.format(deadlineDate)}
                {!todo.done && <span className="font-medium"> · {relative(deadlineDate.getTime() - now.getTime())}</span>}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="-my-1 flex shrink-0 gap-0.5 transition-opacity duration-150 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <button
          onClick={onEdit}
          aria-label={`Modifier « ${todo.text} »`}
          title="Modifier"
          className="grid h-8 w-8 place-content-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <PencilIcon />
        </button>
        <button
          onClick={onDelete}
          aria-label={`Supprimer « ${todo.text} »`}
          title="Supprimer"
          className="grid h-8 w-8 place-content-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
