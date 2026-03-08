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

    test("handles boundary exactly at last explicit", () => {
      assert.strictEqual(isMilestone(300, policy), true);
    });

    test("handles no milestones in policy but has recurring", () => {
      const emptyPolicy = { recurringMilestoneInterval: 100 };
      assert.strictEqual(isMilestone(100, emptyPolicy), true);
      assert.strictEqual(isMilestone(200, emptyPolicy), true);
      assert.strictEqual(isMilestone(150, emptyPolicy), false);
    });
  });

  describe("getDaysInMonth", () => {
    test("returns correct days for February 2026", () => {
      const days = getDaysInMonth(2026, 1);
      assert.strictEqual(days.length, 28);
      assert.strictEqual(days[0], 1);
      assert.strictEqual(days[27], 28);
    });

    test("handles leap years", () => {
      const days = getDaysInMonth(2024, 1);
      assert.strictEqual(days.length, 29);
    });
  });

  describe("getMilestonesForPolicy", () => {
    const policy = MOCK_POLICIES.Wordle;

    test("returns next milestone and previous 3 for high count", () => {
      const milestones = getMilestonesForPolicy(450, policy);
      assert.deepStrictEqual(milestones, [200, 300, 400, 500]);
    });

    test("returns milestones for low count", () => {
      const milestones = getMilestonesForPolicy(5, policy);
      assert.deepStrictEqual(milestones, [0, 1, 3, 7]);
    });

    test("handles no recurring milestones", () => {
      const pNoRecur = { ...policy, recurringMilestoneInterval: 0 };
      const milestones = getMilestonesForPolicy(250, pNoRecur);
      assert.deepStrictEqual(milestones, [75, 100, 200, 300]);
    });
  });

  describe("getGridDataForRange", () => {
    test("extracts correct indices for Wordle in late Feb 2026 (Maintained)", () => {
      // Wordle now maintains streak through Feb 24 via freeze
      const data = getGridDataForRange(
        MOCK_CHECKINS,
        "Wordle",
        "2026-02-21",
        "2026-02-28",
      );
      assert.ok(data.activeIndices.includes(0)); // 21
      assert.ok(data.activeIndices.includes(4)); // 25
      assert.ok(data.frozenIndices.includes(3), "Feb 24 gap should be frozen");
    });

    test("extracts grace periods for a maintained streak", () => {
      const mock = [
        { subject: "GraceTest", streakDate: "2026-01-01", streakSequence: 1 },
        { subject: "GraceTest", streakDate: "2026-01-03", streakSequence: 2 },
      ];
      const data = getGridDataForRange(
        mock,
        "GraceTest",
        "2026-01-01",
        "2026-01-03",
      );
      assert.deepStrictEqual(data.activeIndices, [0, 2]);
      assert.deepStrictEqual(data.graceIndices, [1]);
    });

    test("handles empty checkins", () => {
      const data = getGridDataForRange(
        [],
        "Wordle",
        "2026-01-01",
        "2026-01-07",
      );
      assert.strictEqual(data.activeIndices.length, 0);
    });
  });
});
