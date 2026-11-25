import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deleteSession } from "@/lib/session";

/** Session invalide ou expirée : on efface le cookie puis on renvoie vers la connexion (évite une boucle de redirections). */
export async function GET(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
