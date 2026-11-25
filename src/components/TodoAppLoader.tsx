"use client";

import dynamic from "next/dynamic";
import Skeleton from "./Skeleton";
import type { PublicUser, Todo } from "@/lib/types";

// Rendu côté client uniquement : les dates relatives (« dans 2 h ») dépendent de l'heure du navigateur
const TodoApp = dynamic(() => import("./TodoApp"), {
  ssr: false,
  loading: () => <Skeleton />,
});

export default function TodoAppLoader(props: { user: PublicUser; initialTodos: Todo[] }) {
  return <TodoApp {...props} />;
}
