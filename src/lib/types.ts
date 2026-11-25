export type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  /** Date prévue, format "AAAA-MM-JJ" */
  date?: string;
  /** Échéance, format "AAAA-MM-JJTHH:MM" (heure locale) */
  deadline?: string;
};

export type PublicUser = { name: string; email: string };
