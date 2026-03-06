import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateNextCheckin,
  getIntervalIndex,
  validateCheckinSequence,
} from "../labeler/src/streak-logic.js";

describe("Mutation Hardening - Final Precision", () => {
  test("getIntervalIndex - all branches precision", () => {
    // Relative shifts are good, but absolute checks kill more mutants
    // Quarterly boundary
    const q1 = getIntervalIndex("2026-03-31", { type: "quarterly" });
    const q2 = getIntervalIndex("2026-04-01", { type: "quarterly" });
    assert.strictEqual(q2 - q1, 1);

    // Yearly boundary
    const y1 = getIntervalIndex("2026-12-31", { type: "yearly" });
    const y2 = getIntervalIndex("2027-01-01", { type: "yearly" });
    assert.strictEqual(y2 - y1, 1);

    // Weekly resetDay branches (Kill survivors in Line 13, 23)
    const w1 = getIntervalIndex("2026-03-01", {
      type: "weekly",
      intervalResetDay: 0,
    }); // Sunday
    const w2 = getIntervalIndex("2026-03-01", {
      type: "weekly",
      intervalResetDay: 1,
    }); // Monday
    assert.notStrictEqual(w1, w2, "Weekly index MUST change with resetDay");
  });

  test("calculateNextCheckin - conditional precision", () => {
    const last = {
      streakSequence: 1,
      streakDate: "2026-03-01",
      checkinsInInterval: 1,
    };
    const p = {
      cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
      gracePeriodIntervals: 1,
    };

    // Grace period covering exact gap
    const res = calculateNextCheckin(
      last,
      { balance: 0 },
      p,
      "now",
      "2026-03-03",
    );
    assert.strictEqual(
      res.nextCheckin.freezesClaimed,
      0,
      "Grace MUST cover 1 skip exactly",
    );
    assert.strictEqual(res.nextInventory, null);

    // Broken reset precisely at 1
    const res2 = calculateNextCheckin(
      last,
      { balance: 0 },
      { ...p, gracePeriodIntervals: 0 },
      "now",
      "2026-03-03",
    );
    assert.strictEqual(
      res2.nextCheckin.streakSequence,
      1,
      "Broken streak MUST reset to exactly 1",
    );
  });

  test("validateCheckinSequence - message content and errors", () => {
    const v1 = {
      streakSequence: 1,
      streakDate: "2026-03-01",
      checkinsInInterval: 1,
    };
    const p = { cadence: { type: "daily", requiredCheckinsPerInterval: 1 } };

    // Sequence mismatch message must contain specific indices/values
    try {
      validateCheckinSequence(
        [
          v1,
          {
            streakSequence: 10,
            streakDate: "2026-03-02",
            checkinsInInterval: 1,
          },
        ],
        p,
      );
    } catch (e) {
      assert.strictEqual(
        e.message,
        "Streak sequence mismatch at check-in 1. Expected 2, got 10",
      );
    }

    // Interval count mismatch
    try {
      validateCheckinSequence(
        [
          v1,
          {
            streakSequence: 1,
            streakDate: "2026-03-01",
            checkinsInInterval: 1,
          },
        ],
        p,
      );
    } catch (e) {
      assert.strictEqual(
        e.message,
        "Interval check-in count mismatch at check-in 1. Expected 2, got 1",
      );
    }
  });

  test("Record construction fallbacks killed", () => {
    // Initial construction with empty policy
    const res = calculateNextCheckin(
      null,
      null,
      { cadence: { type: "daily" } },
      "now",
      "2026-03-01",
    );
    assert.strictEqual(res.nextCheckin.policy, "at://placeholder");
    assert.strictEqual(res.nextCheckin.subject, "Default");
    assert.strictEqual(res.nextInventory.balance, 0);
  });
});
