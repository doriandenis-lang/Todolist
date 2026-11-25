## Comptes et base de données

- Chaque utilisateur crée un compte (prénom, email, mot de passe) sur `/signup`, puis se connecte sur `/login`.
- Les données sont dans une base **SQLite locale** : `data/todo.db` (créée automatiquement, ignorée par git). Pour sauvegarder vos tâches, copiez ce fichier ; pour tout remettre à zéro, supprimez-le.
- Les mots de passe sont hachés (scrypt) ; la session est un cookie `httpOnly` valable 30 jours.
- Au premier chargement après connexion, les tâches de l'ancienne version (stockées dans le navigateur) sont importées dans le compte.
- Code : `src/lib/` (base, sessions, accès aux tâches), `src/app/actions/` (actions serveur), `src/proxy.ts` (redirections vers la connexion).

Nécessite Node.js 22.13 ou plus récent (module `node:sqlite` intégré).

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
