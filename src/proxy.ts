/**
 * middleware.ts (project root)
 * Next.js middleware — refreshes Supabase auth session on every request.
 *
 * Required by @supabase/ssr to keep the user's session cookie alive.
 * IMPORTANT: Must return `supabaseResponse`, not a new NextResponse.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  // Refresh the session — do NOT remove this call.
  // It's required for Server Components to read the user's session.
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  const protectedPaths = ["/vault", "/leaderboard"];
  const isProtected    = protectedPaths.some(p =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("signin", "1");
    return NextResponse.redirect(url);
  }

  // Always return supabaseResponse — never a plain NextResponse.next()
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - API routes that use the service role (not SSR session)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/og|api/metadata).*)",
  ],
};
