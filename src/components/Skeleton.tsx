export default function Skeleton() {
  return (
    <div className="w-full max-w-xl animate-pulse" aria-label="Chargement…">
      <div className="mb-6 flex justify-end">
        <div className="h-8 w-36 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mb-8 flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-6 w-40 rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-28 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="h-28 rounded-2xl bg-zinc-200/70 dark:bg-zinc-900" />
      <div className="mt-6 h-64 rounded-2xl bg-zinc-200/70 dark:bg-zinc-900" />
    </div>
  );
}
