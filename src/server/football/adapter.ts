/**
 * src/server/football/adapter.ts
 * The ONE file that talks to API-Football (api-football.com / API-Sports).
 *
 * TxLINE (src/server/txline) only provides scores/odds — no player names or
 * match events — so this is a second, independent external source used only
 * for the Timeline (goals/cards/substitutions) and Lineups tabs.
 *
 * API-Football uses its own fixture ids, unrelated to TxLINE's. Since there's
 * no shared id to join on, resolveFixtureId() looks a fixture up once by
 * team names + kickoff date and caches the result on matches.api_football_fixture_id
 * (see queries.ts) so we don't re-resolve on every request.
 *
 * ── Setup ──
 * Sign up free at https://www.api-football.com (dashboard) or via RapidAPI.
 * Direct dashboard (default assumed here): set API_FOOTBALL_KEY, sends the
 * key as `x-apisports-key`. If using RapidAPI instead, also set
 * API_FOOTBALL_BASE_URL=https://api-football-v1.p.rapidapi.com/v3 — headers
 * switch to `x-rapidapi-key`/`x-rapidapi-host` automatically for that host.
 *
 * ── NOTE ── the substitution field polarity below (player = coming ON,
 * assist = coming OFF) is API-Football's documented convention but has not
 * been verified against a live response yet (no key was available while
 * building this) — if it renders backwards once real data flows, swap the
 * two fields in normaliseEvent()'s "subst" branch.
 */

import {
  getApiFootballFixtureId,
  setApiFootballFixtureId,
} from "@/server/db/queries";
import type {
  FootballTimelineEvent,
  FootballLineups,
  FootballLineup,
} from "./types";

function getBaseUrl(): string {
  return process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";
}

function getHeaders(): HeadersInit {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("Missing env var: API_FOOTBALL_KEY");

  const baseUrl = getBaseUrl();
  if (baseUrl.includes("rapidapi.com")) {
    return {
      "x-rapidapi-key": key,
      "x-rapidapi-host": new URL(baseUrl).host,
    };
  }
  return { "x-apisports-key": key };
}

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function normaliseTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "") // strip accents
    .trim();
}

// ── Fixture id resolution (cached) ───────────────────────────────────────────

async function resolveFixtureId(
  matchId: string,
  home: string,
  away: string,
  kickoffUtc: string
): Promise<number | null> {
  const cached = await getApiFootballFixtureId(matchId).catch(() => null);
  if (cached) return cached;

  try {
    const date = kickoffUtc.slice(0, 10); // YYYY-MM-DD
    const res = await fetch(`${getBaseUrl()}/fixtures?date=${date}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.warn(`[football/adapter] fixture lookup failed: ${res.status}`);
      return null;
    }

    const json = (await res.json()) as {
      response: Array<{
        fixture: { id: number };
        teams: { home: { name: string }; away: { name: string } };
      }>;
    };

    const homeNorm = normaliseTeamName(home);
    const awayNorm = normaliseTeamName(away);

    const found = json.response.find((f) => {
      const h = normaliseTeamName(f.teams.home.name);
      const a = normaliseTeamName(f.teams.away.name);
      return (h === homeNorm && a === awayNorm) || (h === awayNorm && a === homeNorm);
    });

    if (!found) return null;

    const fixtureId = found.fixture.id;
    await setApiFootballFixtureId(matchId, fixtureId).catch((err) =>
      console.warn("[football/adapter] failed to cache fixture id:", err)
    );
    return fixtureId;
  } catch (err) {
    console.error("[football/adapter] resolveFixtureId error:", err);
    return null;
  }
}

// ── Timeline events ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseEvent(raw: any, team: "home" | "away"): FootballTimelineEvent | null {
  const minute = raw.time?.elapsed ?? 0;
  const extraMinute = raw.time?.extra ?? null;
  const player = raw.player?.name ?? null;
  const assist = raw.assist?.name ?? null;
  const detail = (raw.detail ?? "") as string;

  if (raw.type === "Goal") {
    if (detail === "Missed Penalty") return null; // not an actual goal
    return {
      minute,
      extraMinute,
      kind: detail === "Own Goal" ? "own_goal" : detail === "Penalty" ? "penalty_goal" : "goal",
      team,
      player,
      secondaryPlayer: assist,
    };
  }

  if (raw.type === "Card") {
    const isRed = detail.toLowerCase().includes("red") || detail.toLowerCase().includes("second yellow");
    return {
      minute,
      extraMinute,
      kind: isRed ? "red_card" : "yellow_card",
      team,
      player,
      secondaryPlayer: null,
    };
  }

  if (raw.type === "subst") {
    return {
      minute,
      extraMinute,
      kind: "substitution",
      team,
      player: assist,   // player coming ON — see NOTE at top of file
      secondaryPlayer: player, // player coming OFF
    };
  }

  return null; // ignore VAR and anything else for now
}

export async function getMatchTimeline(
  matchId: string,
  home: string,
  away: string,
  kickoffUtc: string
): Promise<FootballTimelineEvent[]> {
  try {
    const fixtureId = await resolveFixtureId(matchId, home, away, kickoffUtc);
    if (!fixtureId) return [];

    const res = await fetch(`${getBaseUrl()}/fixtures/events?fixture=${fixtureId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.warn(`[football/adapter] events fetch failed: ${res.status}`);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as { response: any[] };
    const homeNorm = normaliseTeamName(home);

    return json.response
      .map((raw) => {
        const team: "home" | "away" =
          normaliseTeamName(raw.team?.name ?? "") === homeNorm ? "home" : "away";
        return normaliseEvent(raw, team);
      })
      .filter((e): e is FootballTimelineEvent => e !== null)
      .sort((a, b) => a.minute - b.minute);
  } catch (err) {
    console.error("[football/adapter] getMatchTimeline error:", err);
    return [];
  }
}

// ── Lineups ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseLineup(raw: any): FootballLineup {
  return {
    formation: raw?.formation ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startXI: (raw?.startXI ?? []).map((entry: any) => ({
      number: entry.player?.number ?? 0,
      name: entry.player?.name ?? "",
      position: entry.player?.pos ?? null,
    })),
  };
}

export async function getMatchLineups(
  matchId: string,
  home: string,
  away: string,
  kickoffUtc: string
): Promise<FootballLineups | null> {
  try {
    const fixtureId = await resolveFixtureId(matchId, home, away, kickoffUtc);
    if (!fixtureId) return null;

    const res = await fetch(`${getBaseUrl()}/fixtures/lineups?fixture=${fixtureId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.warn(`[football/adapter] lineups fetch failed: ${res.status}`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as { response: any[] };
    if (json.response.length < 2) return null;

    const homeNorm = normaliseTeamName(home);
    const homeRaw = json.response.find((r) => normaliseTeamName(r.team?.name ?? "") === homeNorm) ?? json.response[0];
    const awayRaw = json.response.find((r) => r !== homeRaw) ?? json.response[1];

    return {
      home: normaliseLineup(homeRaw),
      away: normaliseLineup(awayRaw),
    };
  } catch (err) {
    console.error("[football/adapter] getMatchLineups error:", err);
    return null;
  }
}
