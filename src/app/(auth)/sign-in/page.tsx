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
  const { data: { user } } = await supabase.auth.getUser()

  // Already signed in — send them where they were going
  if (user) {
    const next = resolvedSearchParams.next ?? '/'
    // Security: only redirect to internal paths
    const safePath = next.startsWith('/') ? next : '/'
    redirect(safePath)
  }

  const heading =
    SIGN_IN_HEADINGS[resolvedSearchParams.reason ?? 'default'] ??
    SIGN_IN_HEADINGS.default

  return (
    <div className="min-h-screen flex flex-col font-body pb-16 sm:pb-0" style={{ background: 'var(--color-base)' }}>
      <div className="px-5 py-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
        <span className="font-display text-xl tracking-wide" style={{ color: 'var(--color-fore)' }}>MOMENTO</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          <h1 className="font-display text-[48px] leading-none mb-2" style={{ color: 'var(--color-fore)' }}>
            {heading.title}
          </h1>
          <p className="text-[15px] mb-8 font-medium" style={{ color: 'var(--color-fore-2)' }}>
            {heading.sub}
          </p>
          <SignInForm next={resolvedSearchParams.next} />
          <p className="text-[11px] text-center mt-6" style={{ color: 'var(--color-fore-3)' }}>
            By continuing you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  )
}
