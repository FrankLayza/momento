import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase middleware client — matches the official @supabase/ssr pattern.
 *
 * IMPORTANT: Returns both `supabase` (for auth calls in src/middleware.ts)
 * and `supabaseResponse` (must be returned from middleware to forward cookies).
 *
 * The `supabase` client is needed so root middleware can call getUser()
 * to protect routes. If you only need session refresh (no route protection),
 * you can return just `supabaseResponse` like the Supabase template does.
 */
export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  // Return BOTH:
  //   supabase         → call supabase.auth.getUser() in src/middleware.ts
  //   supabaseResponse → MUST be returned from middleware (contains refreshed cookies)
  return { supabase, supabaseResponse };
};