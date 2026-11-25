import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Redirections « optimistes » basées sur la seule présence du cookie de session.
 * La vraie vérification (session valide en base) est faite côté serveur dans la page et les actions.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("session");
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!hasSession && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup"],
};
