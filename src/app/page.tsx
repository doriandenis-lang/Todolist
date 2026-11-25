import { Suspense } from "react";
import { redirect } from "next/navigation";
import Skeleton from "@/components/Skeleton";
import TodoAppLoader from "@/components/TodoAppLoader";
import { getCurrentUser } from "@/lib/session";
import { listTodos } from "@/lib/todos";

export default function Home() {
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950 sm:px-6 sm:py-16">
      {/* La lecture de la session se fait à la requête : elle doit être dans un <Suspense> */}
      <Suspense fallback={<Skeleton />}>
        <UserTodos />
      </Suspense>
    </main>
  );
}

async function UserTodos() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/expired");

  return <TodoAppLoader user={{ name: user.name, email: user.email }} initialTodos={listTodos(user.id)} />;
}
