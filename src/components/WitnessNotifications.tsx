/**
 * src/components/WitnessNotifications.tsx
 * Live in-app notification when a new Moment fires for a match the current
 * user is Witnessing. Implements FR-5.1 (PRD) via Supabase Realtime —
 * Witnesses notified within 30s of Moment creation and can claim in one tap.
 *
 * Requires `moments` to be added to the `supabase_realtime` publication
 * (see docs/DEVIATIONS.md).
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";
import { ClaimToast } from "./ClaimToast";
import type { Moment } from "@/lib/types";

interface Props {
  matchId: string;
  isWitness: boolean;
}

function dbRowToMoment(row: Record<string, unknown>): Moment {
  return {
    id:           row["id"] as string,
    matchId:      row["match_id"] as string,
    trigger:      row["trigger"] as Moment["trigger"],
    minute:       row["minute"] as number,
    eventUtc:     row["event_utc"] as string,
    scoreHome:    row["score_home"] as number,
    scoreAway:    row["score_away"] as number,
    pBefore:      row["p_before"] as Moment["pBefore"],
    pAfter:       row["p_after"] as Moment["pAfter"],
    pPreMatch:    row["p_pre_match"] as Moment["pPreMatch"],
    shockScore:   row["shock_score"] as number,
    tier:         row["tier"] as Moment["tier"],
    witnessCount: row["witness_count"] as number,
    sealedAt:     row["sealed_at"] as string | null,
    dedupeKey:    row["dedupe_key"] as string,
  };
}

export function WitnessNotifications({ matchId, isWitness }: Props) {
  const router = useRouter();
  const [queue, setQueue] = useState<Moment[]>([]);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (!isWitness) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`moments:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "moments", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setQueue(prev => [...prev, dbRowToMoment(payload.new as Record<string, unknown>)]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, isWitness]);

  if (!isWitness || queue.length === 0) return null;

  const dismiss = (id: string) => setQueue(prev => prev.filter(m => m.id !== id));

  const claim = async (moment: Moment) => {
    setClaimError(null);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ momentId: moment.id }),
      });

      if (res.status === 401) {
        router.push("/?signin=1");
        return;
      }

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setClaimError(body?.error ?? copy.errors.generic);
        return;
      }

      dismiss(moment.id);
      router.refresh();
    } catch {
      setClaimError(copy.errors.generic);
    }
  };

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {claimError && (
        <p className="pointer-events-auto text-[11px] text-tier-seismic bg-surface-raised border border-tier-seismic/30 rounded-lg px-3 py-1.5">
          {claimError}
        </p>
      )}
      {queue.map(moment => (
        <div key={moment.id} className="pointer-events-auto w-full max-w-sm">
          <ClaimToast
            moment={moment}
            onClaim={() => { void claim(moment); }}
            onDismiss={() => dismiss(moment.id)}
          />
        </div>
      ))}
    </div>
  );
}
