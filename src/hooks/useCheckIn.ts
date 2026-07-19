'use client'
// Implements FR-2.1, FR-2.2
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useCheckIn(matchId: string, initialCheckedIn: boolean) {
  const [isCheckedIn, setIsCheckedIn] = useState(initialCheckedIn)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function checkIn() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to sign-in, return here after
      router.push(
        `/sign-in?next=${encodeURIComponent(`/match/${matchId}`)}&reason=checkin`
      )
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      })
      if (res.ok) {
        setIsCheckedIn(true)
        router.push(`/match/${matchId}`)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to check in.')
      }
    } catch (err) {
      console.error('[useCheckIn] Check-in request failed:', err)
      alert('Failed to check in.')
    } finally {
      setLoading(false)
    }
  }

  return { isCheckedIn, loading, checkIn }
}
