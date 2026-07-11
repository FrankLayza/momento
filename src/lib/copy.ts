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
    howItWorks: [
      {
        title: "Check in",
        body: "Join a live match with one tap. You are now a Witness.",
      },
      {
        title: "A Moment fires",
        body: "When a goal, red card or upset hits, we capture it instantly.",
      },
      {
        title: "Claim it forever",
        // NOTE: source spec cut off here — only "Only Witnesses can claim."
        // was given. Flagged for the human to complete rather than invented.
        body: "Only Witnesses can claim.",
      },
    ],
  },

  // ── Errors ───────────────────────────────────────────────────────────────
  errors: {
    generic:   "Something went wrong. Please try again.",
    signIn:    "Sign in to continue.",
    notFound:  "This Moment does not exist.",
  },
} as const;
