'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCheckIn } from '@/hooks/useCheckIn'

interface AutoCheckInProps {
  matchId: string
  initialCheckedIn: boolean
}

export function AutoCheckIn({ matchId, initialCheckedIn }: AutoCheckInProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isCheckedIn, checkIn } = useCheckIn(matchId, initialCheckedIn)

  useEffect(() => {
    if (searchParams.get('reason') === 'checkin' && !isCheckedIn) {
      void checkIn().then(() => {
        // Strip the reason param so refresh doesn't re-trigger
        const params = new URLSearchParams(window.location.search)
        params.delete('reason')
        params.delete('next')
        const query = params.toString()
        router.replace(`/match/${matchId}${query ? `?${query}` : ''}`)
      })
    }
  }, [searchParams, isCheckedIn, matchId, router, checkIn])

  return null
}
