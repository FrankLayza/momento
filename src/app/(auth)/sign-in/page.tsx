/**
 * src/app/(auth)/sign-in/page.tsx
 * Redesigned Sign In page inspired by the Spotify design concept.
 * Flat background, centered branding, and clean, flat fields.
 * Implements FR-2.3 (PRD) — auth page.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/SignInForm';
import { SIGN_IN_HEADINGS } from '@/lib/copy';

interface Props {
  searchParams: Promise<{ next?: string; reason?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Already signed in — send them where they were going
  if (user) {
    const next = resolvedSearchParams.next ?? '/';
    // Security: only redirect to internal paths
    const safePath = next.startsWith('/') ? next : '/';
    redirect(safePath);
  }

  const heading =
    SIGN_IN_HEADINGS[resolvedSearchParams.reason ?? 'default'] ??
    SIGN_IN_HEADINGS.default;

  return (
    <div className="min-h-screen flex flex-col font-body pb-16 sm:pb-0" style={{ background: 'var(--color-base)' }}>
      {/* Centered Spotify-style Logo Brand */}
      <div className="flex flex-col items-center pt-12 pb-6">
        <span className="font-unbounded text-2xl font-bold tracking-tight text-fore">Momento</span>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-[360px] text-center">
          {/* Centered Heading */}
          <div className="mb-8">
            <h1 className="font-unbounded text-[28px] sm:text-[32px] font-bold leading-tight mb-2 text-fore tracking-tight">
              {heading.title}
            </h1>
            <p className="text-[13px] font-semibold leading-relaxed text-ink-secondary/70">
              {heading.sub}
            </p>
          </div>

          <SignInForm next={resolvedSearchParams.next} />

          <p className="text-[10px] text-center mt-8 text-ink-secondary/40 font-bold uppercase tracking-wider">
            By continuing you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
