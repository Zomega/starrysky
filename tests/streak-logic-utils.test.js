import { test, describe } from "node:test";
import assert from "node:assert";
import {
  isMilestone,
  getGridDataForRange,
  getDaysInMonth,
  getMilestonesForPolicy,
} from "../labeler/src/streak-logic.js";
import { MOCK_POLICIES, MOCK_CHECKINS } from "../labeler/src/mock-data.js";

describe("Streak Logic Utilities", () => {
  describe("isMilestone", () => {
    const policy = MOCK_POLICIES.Wordle;

    test("returns true for explicit milestones", () => {
      assert.strictEqual(isMilestone(1, policy), true);
      assert.strictEqual(isMilestone(7, policy), true);
      assert.strictEqual(isMilestone(300, policy), true);
    });

    test("returns true for recurring milestones", () => {
      // 300 is last explicit, recurring is 100. So 400, 500 should be true.
      assert.strictEqual(isMilestone(400, policy), true);
      assert.strictEqual(isMilestone(500, policy), true);
    });

    test("returns false for non-milestones", () => {
      assert.strictEqual(isMilestone(2, policy), false);
      assert.strictEqual(isMilestone(301, policy), false);
      assert.strictEqual(isMilestone(450, policy), false);
    });

    test("returns false for zero or negative", () => {
      assert.strictEqual(isMilestone(0, policy), false);
      assert.strictEqual(isMilestone(-1, policy), false);
    });
  });

  describe("getDaysInMonth", () => {
    test("returns correct days for February 2026", () => {
      const days = getDaysInMonth(2026, 1); // 0-indexed month
      assert.strictEqual(days.length, 28);
      assert.strictEqual(days[0], 1);
      assert.strictEqual(days[27], 28);
    });

    test("returns correct days for January 2026", () => {
      const days = getDaysInMonth(2026, 0);
      assert.strictEqual(days.length, 31);
    });

    test("handles leap years", () => {
      const days = getDaysInMonth(2024, 1);
      assert.strictEqual(days.length, 29);
    });
  });

  describe("getMilestonesForPolicy", () => {
    const policy = MOCK_POLICIES.Wordle;

    test("returns next milestone and previous 3 for high count", () => {
      // Wordle milestones: [1, 3, 7, 10, 25, 50, 75, 100, 200, 300]
      const milestones = getMilestonesForPolicy(450, policy);
      // Next goal is 500 (recurring). Previous 3: 400, 300, 200.
      // So [200, 300, 400, 500]
      assert.deepStrictEqual(milestones, [200, 300, 400, 500]);
    });

    test("returns milestones for low count", () => {
      const milestones = getMilestonesForPolicy(5, policy);
      // Next goal is 7. Previous are 3, 1, 0.
      assert.deepStrictEqual(milestones, [0, 1, 3, 7]);
    });
  });

  describe("getGridDataForRange", () => {
    test("extracts correct indices for Wordle in late Feb 2026", () => {
      // Window: 2026-02-21 to 2026-02-28 (8 days)
      const data = getGridDataForRange(
        MOCK_CHECKINS,
        "Wordle",
        "2026-02-21",
        "2026-02-28"
      );

      // 21: Active
      // 22: Active
      // 23: Active
      // 24: Frozen (claimed in 25 checkin)
      // 25: Active
      // 26: Active
      // 27: Active
      // 28: Active
      
      // WAIT, let's check MOCK_CHECKINS for Wordle in Feb.
      // Feb 21: streakSequence 496, freezeDates []
      // Feb 22: streakSequence 497, freezeDates []
      // Feb 23: streakSequence 498, freezeDates []
      // Feb 25: streakSequence 499, freezeDates ["2026-02-24"]
      // Feb 26: streakSequence 500, freezeDates []
      // Feb 27: streakSequence 501, freezeDates []
      // Feb 28: streakSequence 502, freezeDates []

      // Indices (0-7):
      // 0 (21): active
      // 1 (22): active
      // 2 (23): active
      // 3 (24): frozen
      // 4 (25): active
      // 5 (26): active
      // 6 (27): active
      // 7 (28): active

      assert.deepStrictEqual(data.activeIndices, [0, 1, 2, 4, 5, 6, 7]);
      assert.deepStrictEqual(data.frozenIndices, [3]);
      assert.deepStrictEqual(data.graceIndices, []);
    });

    test("extracts grace periods for Chess", () => {
      // Chess has gracePeriodIntervals: 2
      // Feb 21: active (idx 0)
      // Feb 24: active (idx 3). Gaps: 22, 23.
      const data = getGridDataForRange(
        MOCK_CHECKINS,
        "Chess",
        "2026-02-21",
        "2026-02-24"
      );
      assert.ok(data.activeIndices.includes(0));
      assert.ok(data.activeIndices.includes(3));
      assert.ok(data.graceIndices.includes(1));
      assert.ok(data.graceIndices.includes(2));
    });
  });
});
