import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateNextCheckin,
  getIntervalIndex,
  calculateClaimInventory,
  validateCheckinSequence,
} from "../labeler/src/streak-logic.js";

const basePolicy = {
  originService: "app.test",
  cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
  gracePeriodIntervals: 0,
  maxFreezes: 5,
  includeFreezesInStreak: false,
};

describe("Core Streak Logic - Robustness Suite", () => {
  test("getIntervalIndex precision and cadence boundaries", () => {
    // Exact day index gap (Arithmetic precision)
    const d1 = getIntervalIndex("2026-03-01", { type: "daily" });
    const d2 = getIntervalIndex("2026-03-03", { type: "daily" });
    assert.strictEqual(d2 - d1, 2, "2 days gap must be exactly 2 units");

    // Monthly rollover precision
    const m1 = getIntervalIndex("2026-12-31", { type: "monthly" });
    const m2 = getIntervalIndex("2027-01-01", { type: "monthly" });
    assert.strictEqual(
      m2 - m1,
      1,
      "Year rollover must advance monthly index by 1",
    );

    // Quarterly precision
    const q1 = getIntervalIndex("2026-03-31", { type: "quarterly" });
    const q2 = getIntervalIndex("2026-04-01", { type: "quarterly" });
    assert.strictEqual(q2 - q1, 1);

    // Yearly precision
    const y1 = getIntervalIndex("2026-12-31", { type: "yearly" });
    const y2 = getIntervalIndex("2027-01-01", { type: "yearly" });
    assert.strictEqual(y2 - y1, 1);
  });

  test("Initial check-in and Record Construction exhaustive field checks", () => {
    const richPolicy = {
      ...basePolicy,
      startingFreezes: 2,
      maxFreezes: 10,
      uri: "at://policy",
      subject: "My Streak",
    };
    const res = calculateNextCheckin(
      null,
      null,
      richPolicy,
      "2026-03-01T12:00:00Z",
      "2026-03-01",
    );

    assert.strictEqual(res.nextCheckin.streakSequence, 1);
    assert.strictEqual(res.nextCheckin.policy, "at://policy");
    assert.strictEqual(res.nextCheckin.subject, "My Streak");
    assert.strictEqual(res.nextCheckin.checkinsInInterval, 1);
    assert.deepStrictEqual(res.nextCheckin.freezeDates, []);

    assert.strictEqual(res.nextInventory.balance, 2);
    assert.strictEqual(res.nextInventory.action, "initialize");
    assert.strictEqual(res.nextInventory.policy, "at://policy");
    assert.strictEqual(res.nextInventory.subject, "My Streak");
  });

  test("Gap calculation, freeze usage, and grace periods (Arithmetic precision)", () => {
    const last = {
      streakSequence: 10,
      streakDate: "2026-03-01",
      checkinsInInterval: 1,
      cid: "prev-c",
    };
    const inv = { balance: 5, cid: "prev-i" };

    // 1. One skip covered by 1 freeze (Arithmetic: 10+1=11, 5-1=4)
    const res1 = calculateNextCheckin(
      last,
      inv,
      basePolicy,
      "now",
      "2026-03-03",
    );
    assert.strictEqual(res1.nextCheckin.streakSequence, 11);
    assert.strictEqual(res1.nextCheckin.freezesClaimed, 1);
    assert.deepStrictEqual(res1.nextCheckin.freezeDates, ["2026-03-02"]);
    assert.strictEqual(res1.nextInventory.balance, 4);
    assert.strictEqual(res1.nextInventory.action, "spend");

    // 2. Unfinished interval skip (Arithmetic: passed=1, unf=1, total=1)
    const lastUnf = { ...last, checkinsInInterval: 0 };
    const res2 = calculateNextCheckin(
      lastUnf,
      inv,
      basePolicy,
      "now",
      "2026-03-02",
    );
    assert.strictEqual(res2.nextCheckin.freezesClaimed, 1);
    assert.strictEqual(res2.nextCheckin.streakSequence, 11);

    // 3. includeFreezesInStreak: true (Arithmetic: 10 + 2 (gaps) + 1 (new) = 13)
    const pInc = { ...basePolicy, includeFreezesInStreak: true };
    const res3 = calculateNextCheckin(last, inv, pInc, "now", "2026-03-04");
    assert.strictEqual(res3.nextCheckin.streakSequence, 13);

    // 4. Grace period coverage (Arithmetic: gaps=1, grace=1, freezesNeeded=0)
    const pGrace = { ...basePolicy, gracePeriodIntervals: 1 };
    const res4 = calculateNextCheckin(last, inv, pGrace, "now", "2026-03-03");
    assert.strictEqual(res4.nextCheckin.freezesClaimed, 0);
    assert.strictEqual(res4.nextInventory, null);
  });

  test("Reward logic precision and boundaries", () => {
    const pMileOnly = {
      ...basePolicy,
      milestones: [10],
      freezesGrantedAtMilestone: 2,
      intervalsToEarnFreeze: 0,
      maxFreezes: 10,
    };

    // Explicit milestone 10
    const r1 = calculateNextCheckin(
      { streakSequence: 9, streakDate: "2026-03-01", checkinsInInterval: 1 },
      { balance: 0 },
      pMileOnly,
      "now",
      "2026-03-02",
    );
    assert.strictEqual(r1.nextInventory.balance, 2, "Grant must be EXACTLY 2");

    // Both (Milestone 10 + Rate 5 = 3)
    const pBoth = { ...pMileOnly, intervalsToEarnFreeze: 5 };
    const r2 = calculateNextCheckin(
      { streakSequence: 9, streakDate: "2026-03-01", checkinsInInterval: 1 },
      { balance: 0 },
      pBoth,
      "now",
      "2026-03-02",
    );
    assert.strictEqual(r2.nextInventory.balance, 3, "2 (mile) + 1 (rate) = 3");

    // Max Freezes Clamping
    const pMax = { ...pMileOnly, maxFreezes: 1 };
    const r3 = calculateNextCheckin(
      { streakSequence: 9, streakDate: "2026-03-01", checkinsInInterval: 1 },
      { balance: 0 },
      pMax,
      "now",
      "2026-03-02",
    );
    assert.strictEqual(
      r3.nextInventory.balance,
      1,
      "Clamping must enforce maxFreezes",
    );
  });

  test("validateCheckinSequence strict accounting and errors", () => {
    const v1 = {
      streakSequence: 1,
      streakDate: "2026-03-01",
      checkinsInInterval: 1,
    };

    // Correct gap reset
    assert.ok(
      validateCheckinSequence(
        [
          v1,
          {
            streakSequence: 1,
            streakDate: "2026-03-03",
            checkinsInInterval: 1,
            freezesClaimed: 0,
          },
        ],
        basePolicy,
      ),
    );

    // Sequence mismatch throw
    assert.throws(
      () =>
        validateCheckinSequence(
          [
            v1,
            { streakSequence: 2, streakDate: "2026-03-02", streakSequence: 5 },
          ],
          basePolicy,
        ),
      /Streak sequence mismatch/,
    );

    // Interval count mismatch throw
    assert.throws(
      () =>
        validateCheckinSequence(
          [
            v1,
            {
              streakSequence: 1,
              streakDate: "2026-03-01",
              checkinsInInterval: 1,
            },
          ],
          basePolicy,
        ),
      /Interval check-in count mismatch/,
    );
  });

  test("calculateClaimInventory precision and fields", () => {
    const inv = {
      balance: 1,
      originService: "a",
      policy: "b",
      subject: "c",
      cid: "prev",
    };
    // grant count 2, max 5 -> 3
    const res = calculateClaimInventory(
      inv,
      { count: 2, cid: "g" },
      { maxFreezes: 5 },
      "now",
    );
    assert.strictEqual(res.balance, 3);
    assert.strictEqual(res.action, "claim");
    assert.strictEqual(res.relatedFreezeGrant, "g");
    assert.strictEqual(res.prev, "prev");
  });
});
