/**
 * src/components/CheckinButton.tsx
 * Interactive check-in button for matches.
 * Implements FR-2.1 (PRD).
 *
 * Calls POST /api/checkin. Server response is authoritative — a failure
 * (including "not signed in") is shown as a real error, never faked.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";

interface Props {
  matchId: string;
  initialCheckedIn?: boolean;
}

export function CheckinButton({ matchId, initialCheckedIn = false }: Props) {
  const router = useRouter();
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCheckedIn(initialCheckedIn);
  }, [initialCheckedIn]);

  const handleCheckin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });

      if (res.ok) {
        setCheckedIn(true);
        router.refresh();
        return;
      }

      if (res.status === 401) {
        router.push("/?signin=1");
        return;
      }

      const body = await res.json().catch(() => null);
      setError(body?.error ?? copy.errors.generic);
    } catch (err) {
      console.error("[CheckinButton] Failed:", err);
      setError(copy.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  if (checkedIn) {
    return (
      <div className="flex justify-center">
        <button
          disabled
          className="px-6 py-2.5 rounded-full bg-surface-raised border border-tier-notable/20 text-tier-notable text-xs font-bold tracking-wider uppercase cursor-default shadow-sm"
        >
          ✓ {copy.checkin.checkedIn}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        id="checkin-button"
        onClick={() => { void handleCheckin(); }}
        disabled={loading}
        className="px-8 py-2.5 rounded-full bg-tier-notable text-surface hover:bg-tier-notable/90 text-xs font-bold tracking-wider uppercase transition-colors duration-150 disabled:opacity-50 shadow-sm"
      >
        {loading ? "Checking in..." : copy.checkin.action}
      </button>
      {error && (
        <p className="text-[11px] text-tier-seismic text-center">{error}</p>
      )}
    </div>
  );
}
