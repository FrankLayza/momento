/**
 * src/proxy.ts
 * Next.js 16 proxy — replaces the deprecated middleware.ts convention.
 *
 * Two responsibilities:
 *   1. Refresh the Supabase auth session on every request so the access token
 *      in cookies never silently expires. Without this, server-side getUser()
 *      returns null after ~1h — the root cause of the "Failed to decrypt
 *      private key" bug on /advanced.
 *   2. Redirect first-time visitors from "/" to "/welcome".
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // ── 1. Supabase session refresh ───────────────────────────────────────────

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request so downstream RSC/API routes see them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // Recreate the response so it carries the updated request
          supabaseResponse = NextResponse.next({ request });

          // Set cookies on the response so the browser stores the refreshed token
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANT: this getUser() call triggers the token refresh.
    // Even though we don't use the result here, it writes refreshed
    // cookies back to the response via the setAll callback above.
    await supabase.auth.getUser();
  }

  // ── 2. First-visit redirect ("/welcome") ─────────────────────────────────

  if (request.nextUrl.pathname === "/") {
    const hasVisited = request.cookies.get("has_visited");

    if (!hasVisited) {
      const response = NextResponse.redirect(
        new URL("/welcome", request.url)
      );

      // Carry over any refreshed Supabase cookies
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value);
      });

      // Mark as visited (1 year)
      response.cookies.set("has_visited", "true", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });

      return response;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static (static files)
     *   - _next/image  (image optimization)
     *   - favicon.ico  (browser favicon)
     *   - public assets (images, svgs, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
