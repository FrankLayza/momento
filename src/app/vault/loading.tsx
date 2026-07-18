import { KickLoader } from '@/components/KickLoader'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-base)' }}>
      <KickLoader label="Loading vault" />
    </div>
  )
}
