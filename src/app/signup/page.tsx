import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Créer un compte · Ma todo-list" };

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950 sm:items-center">
      <AuthForm mode="signup" />
    </main>
  );
}
