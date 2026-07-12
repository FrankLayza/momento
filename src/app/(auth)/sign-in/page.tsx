// Implements FR-2.3
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignInForm } from '@/components/SignInForm'
import { SIGN_IN_HEADINGS } from '@/lib/copy'

interface Props {
  searchParams: Promise<{ next?: string; reason?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Already signed in — send them where they were going
  if (session) {
    const next = resolvedSearchParams.next ?? '/'
    // Security: only redirect to internal paths
    const safePath = next.startsWith('/') ? next : '/'
    redirect(safePath)
  }

  const heading =
    SIGN_IN_HEADINGS[resolvedSearchParams.reason ?? 'default'] ??
    SIGN_IN_HEADINGS.default

  return (
    <div className="bg-cream min-h-screen flex flex-col">
      <div className="px-8 py-5 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-ink" />
        <span className="font-display font-bold text-lg text-ink">Momento</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          <h1 className="font-display text-[32px] font-bold text-ink leading-[1.1] mb-2">
            {heading.title}
          </h1>
          <p className="text-[15px] text-ink-secondary mb-8">
            {heading.sub}
          </p>
          <SignInForm next={resolvedSearchParams.next} />
          <p className="text-[11px] text-ink-ghost text-center mt-6">
            By continuing you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  )
}
