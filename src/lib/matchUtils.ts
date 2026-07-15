import type { NormalisedMatch } from "@/server/txline/types";

/**
 * Formats match minute handling added/stoppage time correctly
 * based on the current match phase.
 */
export function formatMatchMinute(minute: number | null, phase?: NormalisedMatch["phase"]): string {
  if (minute === null || minute === undefined) return "";
  
  if (phase === "H1" && minute > 45) {
    return `45+${minute - 45}`;
  }
  if (phase === "H2" && minute > 90) {
    return `90+${minute - 90}`;
  }
  if (phase === "ET1" && minute > 105) {
    return `105+${minute - 105}`;
  }
  if (phase === "ET2" && minute > 120) {
    return `120+${minute - 120}`;
  }
  return `${minute}`;
}

/**
 * Gets the localized display label for the current period of play.
 */
export function getPeriodLabel(minute: number | null, phase?: NormalisedMatch["phase"]): string {
  if (phase === "H1") return "First half";
  if (phase === "HT") return "Half time";
  if (phase === "H2") return "Second half";
  if (phase === "FT") return "Full time";
  if (phase === "ET1" || phase === "ET2") return "Extra time";
  if (phase === "PEN") return "Penalties";
  
  // Fallbacks if phase is missing
  if (minute !== null) {
    if (minute > 90) return "Extra time";
    if (minute > 45) return "Second half";
  }
  return "First half";
}
