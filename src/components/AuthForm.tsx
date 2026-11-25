"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, signupAction, type AuthState } from "@/app/actions/auth";

type Mode = "login" | "signup";

const copy = {
  login: {
    title: "Bon retour !",
    subtitle: "Connectez-vous pour retrouver vos tâches.",
    submit: "Se connecter",
    pending: "Connexion…",
    switchText: "Pas encore de compte ?",
    switchLink: "Créer un compte",
    switchHref: "/signup",
  },
  signup: {
    title: "Créer un compte",
    subtitle: "Vos tâches seront enregistrées et retrouvées à chaque connexion.",
    submit: "Créer mon compte",
    pending: "Création…",
    switchText: "Déjà un compte ?",
    switchLink: "Se connecter",
    switchHref: "/login",
  },
} as const;

const inputClass =
  "h-10 w-full rounded-lg border bg-white px-3 text-zinc-900 outline-none transition-colors duration-150 ease-out-soft placeholder:text-zinc-400 hover:border-zinc-300 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20";

function Field({
  label,
  error,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const t = copy[mode];
  const fe = state?.fieldErrors ?? {};
  const border = (err?: string) => (err ? "border-red-400 dark:border-red-500/60" : "border-zinc-200 dark:border-zinc-800");

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascotte.png"
          alt="Grenouille à lunettes avec un crayon"
          width={175}
          height={126}
          className="mb-5 h-16 w-16 rounded-2xl border border-zinc-200 bg-white object-contain p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{t.title}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
      </div>

      <form
        action={formAction}
        noValidate
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        {state?.error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
            </svg>
            {state.error}
          </div>
        )}

        {mode === "signup" && (
          <Field label="Prénom" htmlFor="name" error={fe.name}>
            <input
              id="name"
              name="name"
              autoComplete="given-name"
              defaultValue={state?.values?.name}
              aria-invalid={!!fe.name}
              aria-describedby={fe.name ? "name-error" : undefined}
              className={`${inputClass} ${border(fe.name)}`}
              autoFocus
            />
          </Field>
        )}

        <Field label="Email" htmlFor="email" error={fe.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="vous@exemple.fr"
            defaultValue={state?.values?.email}
            aria-invalid={!!fe.email}
            aria-describedby={fe.email ? "email-error" : undefined}
            className={`${inputClass} ${border(fe.email)}`}
            autoFocus={mode === "login"}
          />
        </Field>

        <Field
          label="Mot de passe"
          htmlFor="password"
          error={fe.password}
          hint={mode === "signup" ? "8 caractères minimum." : undefined}
        >
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              aria-invalid={!!fe.password}
              aria-describedby={fe.password ? "password-error" : undefined}
              className={`${inputClass} ${border(fe.password)} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-1 right-1 rounded-md px-2.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </Field>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition-colors duration-150 ease-out-soft hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-wait disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {pending && (
            <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="2.5" />
              <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
          {pending ? t.pending : t.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {t.switchText}{" "}
        <Link href={t.switchHref} className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
          {t.switchLink}
        </Link>
      </p>
    </div>
  );
}
