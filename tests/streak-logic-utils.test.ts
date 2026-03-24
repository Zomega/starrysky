import { test, describe } from "node:test";
import assert from "node:assert";
import {
  isMilestone,
  getGridDataForRange,
  getDaysInMonth,
  getMilestonesForPolicy,
} from "../service/src/core/streak-logic.ts";
import { MOCK_POLICIES, MOCK_CHECKINS } from "../service/src/mock-data.js";

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

    test("identifies perfect weeks", () => {
      const mock = [];
      for (let i = 1; i <= 14; i++) {
        const date = `2026-03-${i.toString().padStart(2, "0")}`;
        mock.push({ subject: "Perfect", streakDate: date, streakSequence: i });
      }
      // 2026-03-01 is a Sunday.
      // 2026-03-01 to 2026-03-07 is a perfect week (idx 0 to 6).
      // Wednesday is idx 3.
      const data = getGridDataForRange(
        mock,
        "Perfect",
        "2026-03-01",
        "2026-03-14",
      );
      assert.ok(
        data.perfectWeekIndices.includes(3),
        "Should have perfect week on first Wednesday",
      );
      assert.ok(
        data.perfectWeekIndices.includes(10),
        "Should have perfect week on second Wednesday",
      );
    });

    test("captures custom icons", () => {
      const mock = [
        {
          subject: "Icons",
          streakDate: "2026-01-01",
          icons: ["star", "heart"],
        },
      ];
      const data = getGridDataForRange(
        mock,
        "Icons",
        "2026-01-01",
        "2026-01-01",
      );
      assert.ok(data.customIconMap.has(0));
      assert.deepStrictEqual(data.customIconMap.get(0), ["star", "heart"]);
    });

    test("handles broken streaks with first gap as broken", () => {
      const mock = [
        { subject: "Broken", streakDate: "2026-01-01", streakSequence: 10 },
        { subject: "Broken", streakDate: "2026-01-05", streakSequence: 1 }, // broke!
      ];
      const data = getGridDataForRange(
        mock,
        "Broken",
        "2026-01-01",
        "2026-01-05",
      );
      // Gaps: 02, 03, 04. First gap 02 (idx 1) should be "broken".
      assert.ok(data.brokenIndices.includes(1));
      assert.strictEqual(data.graceIndices.length, 0);
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
