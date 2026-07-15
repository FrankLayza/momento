/**
 * src/server/football/types.ts
 * Normalised types for API-Football data (match timeline events + lineups).
 * Every file outside src/server/football/ imports ONLY from this file —
 * adapter.ts is the ONLY file that speaks to the real API-Football API.
 */

export interface FootballTimelineEvent {
  minute: number;
  extraMinute: number | null;
  kind: "goal" | "own_goal" | "penalty_goal" | "yellow_card" | "red_card" | "substitution";
  team: "home" | "away";
  /** Scorer / carded player / player coming ON for a substitution */
  player: string | null;
  /** Assist (goals) or player coming OFF (substitutions) */
  secondaryPlayer: string | null;
}

export interface FootballLineupPlayer {
  number: number;
  name: string;
  position: string | null; // "G" | "D" | "M" | "F"
}

export interface FootballLineup {
  formation: string | null;
  startXI: FootballLineupPlayer[];
}

export interface FootballLineups {
  home: FootballLineup;
  away: FootballLineup;
}
