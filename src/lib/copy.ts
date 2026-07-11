import type { HowItWorksStep } from "./types";

/**
 * src/lib/copy.ts
 * Implements LR-1/LR-2 (PRD) — ALL fan-facing strings live here.
 *
 * CI RULE: scripts/scan-copy.ts will fail the build if forbidden vocabulary
 * ("NFT", "mint", "token", "blockchain", "crypto", "wallet") appears anywhere
 * in src/ outside src/app/advanced/ — including inside this file in any
 * user-visible string.
 *
 * All copy uses UK English, no em dashes (LR-4).
 */

export const copy = {
  // ── App ─────────────────────────────────────────────────────────────────
  appName: "Momento",
  tagline:  "You were watching. Now you can prove it.",

  // ── Auth (FR-2.3) ────────────────────────────────────────────────────────
  auth: {
    signIn:         "Sign in",
    continue:       "Continue",
    signInWithEmail:"Continue with email",
    signInWithGoogle: "Continue with Google",
    signOut:        "Sign out",
    checkYourEmail: "Check your email for a sign-in link.",
  },

  // ── Fixtures home (FR-1.1) ───────────────────────────────────────────────
  fixtures: {
    today:    "Today",
    upcoming: "Upcoming",
    live:     "Live",
    kickoff:  "Kick-off",
    noFixtures: "No matches scheduled right now.",
    replayBadge: "Replay",  // FR-1.3 — must be clearly labelled
  },

  // ── Check-in / Witnessing (FR-2.1, LR-2) ────────────────────────────────
  checkin: {
    action:      "Check in",
    checkedIn:   "Watching",
    tooLate:     "Match finished — check-in closed.",
    witnesses:   (n: number) => `${n.toLocaleString()} ${n === 1 ? "Witness" : "Witnesses"}`,
  },

  // ── Moment card (FR-3.3, FR-4.3, LR-2) ──────────────────────────────────
  moment: {
    shockRating:      "Shock rating",
    marketChance:     (pct: number) => `The market gave this a ${pct}% chance.`,
    witnessCount:     (n: number)   => `${n.toLocaleString()} ${n === 1 ? "Witness" : "Witnesses"}`,
    eventGoal:        (team: string, minute: number) => `Goal — ${team}, ${minute}'`,
    eventRedCard:     (team: string, minute: number) => `Red card — ${team}, ${minute}'`,
    eventProbQuake:   (minute: number) => `Probability shift at ${minute}'`,
    eventFullTimeUpset: "Full-time upset",
  },

  // ── Claim (FR-5.1, FR-5.3, LR-2) ────────────────────────────────────────
  claim: {
    action:        "Claim",
    claimed:       "Claimed",
    verifiedLine:  "Verified and permanent.",
    alreadyClaimed:"You have already claimed this Moment.",
    notEligible:   "You were not checked in for this one.",
    windowClosed:  "The claim window for this Moment has closed.",
    pending:       "Claiming your Moment...",
  },

  // ── Vault (FR-5.4, LR-2) ─────────────────────────────────────────────────
  vault: {
    title:         "Vault",
    empty:         "Your Vault is empty. Check in to a live match to start.",
    totalMoments:  (n: number) => `${n} ${n === 1 ? "Moment" : "Moments"}`,
    rarestTier:    (tier: string) => `Rarest: ${tier}`,
    matchesWitnessed: (n: number) => `${n} ${n === 1 ? "match" : "matches"} witnessed`,
    sortByScore:   "Shock rating",
    sortByDate:    "Date claimed",
  },

  // ── Share (FR-6.1, FR-6.2) ───────────────────────────────────────────────
  share: {
    action:    "Share",
    copyLink:  "Copy link",
    linkCopied:"Link copied.",
  },

  // ── Public Moment page for non-witnesses (FR-6.3) ────────────────────────
  publicMoment: {
    notWitness:   "You were not checked in for this one.",
    joinNext:     "Check in to the next match.",
    fomoLine:     "Only the fans who were watching live could ever claim this.",
  },

  // ── Leaderboard (FR-7.1) ────────────────────────────────────────────────
  leaderboard: {
    title:    "Leaderboard",
    rankCol:  "Rank",
    userCol:  "Fan",
    scoreCol: "Cumulative shock score",
  },

  // ── Tiers (FR-4.2) ───────────────────────────────────────────────────────
  tiers: {
    Common:  "Common",
    Notable: "Notable",
    Shock:   "Shock",
    Seismic: "Seismic",
  } as const,

  // ── Logged-out landing page ─────────────────────────────────────────────
  landing: {
    navHowItWorks: "How it works",
    navFaq:        "FAQ",
    navSignIn:     "Sign in",
    heroLine1:     "Witness the moment.",
    heroLine2:     "Claim it forever.",
    heroSubcopy:
      "Check in to a live World Cup match. When the impossible happens, claim the moment as a keepsake only the fans watching live can ever own.",
    heroCta: "See today's matches",
    howItWorksTitle: "How it works",
    howItWorksHeading: "Three steps.\nOne moment, forever.",
    howItWorksSubcopy: "Check in before a match starts. When something historic happens, claim it before the window closes.",
  },

  // ── Errors ───────────────────────────────────────────────────────────────
  errors: {
    generic:   "Something went wrong. Please try again.",
    signIn:    "Sign in to continue.",
    notFound:  "This Moment does not exist.",
  },
} as const;

export const HOW_IT_WORKS = [
  {
    number: '01',
    side: 'left' as const,
    heading: 'Pick a match.\nCheck in.',
    body: "Browse live and upcoming fixtures. Tap Check In to become a Witness. No account needed to browse — sign in only when you're ready.",
  },
  {
    number: '02',
    side: 'right' as const,
    heading: 'A Moment fires\nin the data.',
    body: 'When a goal or shock result hits, the market moves. Our engine captures the probability swing and grades the Moment by how unlikely it was.',
  },
  {
    number: '03',
    side: 'left' as const,
    heading: 'Claim it\nbefore it seals.',
    body: 'Only Witnesses who checked in can claim. Once the window closes, no new claims are ever issued — supply is sealed by the final whistle.',
  },
  {
    number: '04',
    side: 'right' as const,
    heading: 'Your Vault.\nYour proof.',
    body: 'Every keepsake lives in your Vault, graded by tier. Share a card in one tap. Your collection shows who you were watching, and when.',
  },
] satisfies HowItWorksStep[];
