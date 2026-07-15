import { KickLoader } from '@/components/KickLoader'

export default function Loading() {
  return (
    <div className="bg-cream min-h-screen flex items-center justify-center">
      <KickLoader label="Loading fixtures" />
    </div>
  )
}
