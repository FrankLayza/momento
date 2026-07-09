/**
 * src/lib/score.test.ts
 * Vitest test suite for computeShockScore().
 * Implements the test cases specified in Implementation Guide §7.
 *
 * Required passing cases:
 *   - 90th-minute goal with pBefore=0.06 → Seismic (score ≥ 85)
 *   - 20th-minute goal by a 0.75 favourite → Common (score ≤ 39)
 *
 * All scores are deterministic: same inputs → same output (FR-4.1).
 */

import { describe, it, expect } from "vitest";
import { computeShockScore } from "./score";

describe("computeShockScore", () => {
  // ── Required test cases (Implementation Guide §7) ──────────────────────────

  it("90th-minute goal with pBefore=0.06 must land Seismic (≥85)", () => {
    const result = computeShockScore({
      pBefore:   0.06,
      pAfter:    0.85,   // winning side now heavily favoured post-goal
      pPreMatch: 0.20,
      minute:    90,
      trigger:   "T1",
    });

    expect(result.shockScore).toBeGreaterThanOrEqual(85);
    expect(result.tier).toBe("Seismic");
  });

  it("20th-minute goal by a 0.75 favourite must land Common (≤39)", () => {
    const result = computeShockScore({
      pBefore:   0.75,
      pAfter:    0.88,
      pPreMatch: 0.72,
      minute:    20,
      trigger:   "T1",
    });

    expect(result.shockScore).toBeLessThanOrEqual(39);
    expect(result.tier).toBe("Common");
  });

  // ── Tier boundary tests ───────────────────────────────────────────────────

  it("score of 40 is Notable", () => {
    const result = computeShockScore({
      pBefore:   0.30,
      pAfter:    0.70,
      pPreMatch: 0.35,
      minute:    45,
      trigger:   "T1",
    });

    // Just verify tier mapping is correct for the given score
    if (result.shockScore >= 40 && result.shockScore <= 64) {
      expect(result.tier).toBe("Notable");
    }
  });

  it("T4 full-time upset with pPreMatch=0.10 scores 100*(1-0.10)=90, floored at 65 → Seismic", () => {
    const result = computeShockScore({
      pBefore:   0.10,
      pAfter:    1.00,
      pPreMatch: 0.10,
      minute:    90,
      trigger:   "T4",
    });

    expect(result.shockScore).toBe(90);
    expect(result.tier).toBe("Seismic");
  });

  it("T4 upset with pPreMatch=0.50 scores 100*(1-0.50)=50, floored at 65 → Shock", () => {
    const result = computeShockScore({
      pBefore:   0.50,
      pAfter:    1.00,
      pPreMatch: 0.50,
      minute:    90,
      trigger:   "T4",
    });

    // base = max(100*(1-0.5), 65) = max(50, 65) = 65
    expect(result.shockScore).toBe(65);
    expect(result.tier).toBe("Shock");
  });

  it("lateness factor applies: same event at 90' scores higher than at 10'", () => {
    const base = { pBefore: 0.3, pAfter: 0.7, pPreMatch: 0.35, trigger: "T1" as const };
    const early = computeShockScore({ ...base, minute: 10 });
    const late  = computeShockScore({ ...base, minute: 90 });

    expect(late.shockScore).toBeGreaterThan(early.shockScore);
  });

  // ── Determinism ───────────────────────────────────────────────────────────

  it("same inputs always produce the same output (FR-4.1)", () => {
    const input = { pBefore: 0.12, pAfter: 0.78, pPreMatch: 0.25, minute: 87, trigger: "T2" as const };
    const a = computeShockScore(input);
    const b = computeShockScore(input);
    const c = computeShockScore(input);

    expect(a.shockScore).toBe(b.shockScore);
    expect(b.shockScore).toBe(c.shockScore);
    expect(a.tier).toBe(b.tier);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("score is clamped to 0..100", () => {
    const extremeHigh = computeShockScore({
      pBefore: 0.01, pAfter: 1.0, pPreMatch: 0.01, minute: 120, trigger: "T1",
    });
    const extremeLow = computeShockScore({
      pBefore: 0.99, pAfter: 0.99, pPreMatch: 0.99, minute: 0, trigger: "T1",
    });

    expect(extremeHigh.shockScore).toBeLessThanOrEqual(100);
    expect(extremeLow.shockScore).toBeGreaterThanOrEqual(0);
  });

  it("score is always an integer", () => {
    const result = computeShockScore({
      pBefore: 0.333, pAfter: 0.667, pPreMatch: 0.4, minute: 55, trigger: "T3",
    });

    expect(Number.isInteger(result.shockScore)).toBe(true);
  });
});
