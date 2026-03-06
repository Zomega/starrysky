import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateNextCheckin,
  getIntervalIndex,
  calculateClaimInventory,
  validateCheckinSequence,
} from "../labeler/src/streak-logic.js";
import {
  basePolicy,
  createLastCheckin,
  createLastInventory,
  getNextDay,
  getDaysLater,
} from "./test-helpers.js";

describe("Core Streak Logic - Interval Indexing", () => {
  test("daily gap precision", () => {
    const d1 = getIntervalIndex("2026-03-01", { type: "daily" });
    const d2 = getIntervalIndex("2026-03-03", { type: "daily" });
    assert.strictEqual(d2 - d1, 2);
  });

  test("monthly rollover precision", () => {
    const m1 = getIntervalIndex("2026-12-31", { type: "monthly" });
    const m2 = getIntervalIndex("2027-01-01", { type: "monthly" });
    assert.strictEqual(m2 - m1, 1);
  });

  test("quarterly boundary precision", () => {
    const q1 = getIntervalIndex("2026-03-31", { type: "quarterly" });
    const q2 = getIntervalIndex("2026-04-01", { type: "quarterly" });
    assert.strictEqual(q2 - q1, 1);
  });

  test("yearly boundary precision", () => {
    const y1 = getIntervalIndex("2026-12-31", { type: "yearly" });
    const y2 = getIntervalIndex("2027-01-01", { type: "yearly" });
    assert.strictEqual(y2 - y1, 1);
  });

  test("weekly resetDay shifts index (kills survivors)", () => {
    const w1 = getIntervalIndex("2026-03-01", {
      type: "weekly",
      intervalResetDay: 0,
    }); // Sunday
    const w2 = getIntervalIndex("2026-03-01", {
      type: "weekly",
      intervalResetDay: 1,
    }); // Monday
    assert.notStrictEqual(w1, w2, "Weekly index must change with resetDay");
  });
});

describe("Core Streak Logic - Initial Check-in", () => {
  test("creates first check-in and inventory with default values", () => {
    const res = calculateNextCheckin(
      null,
      null,
      basePolicy,
      "2026-03-01T12:00:00Z",
      "2026-03-01",
    );

    assert.strictEqual(res.nextCheckin.streakSequence, 1);
    assert.strictEqual(res.nextCheckin.policy, basePolicy.uri);
    assert.strictEqual(res.nextCheckin.subject, basePolicy.subject);
    assert.strictEqual(res.nextCheckin.checkinsInInterval, 1);
    assert.strictEqual(res.nextInventory.balance, basePolicy.startingFreezes);
    assert.strictEqual(res.nextInventory.action, "initialize");
  });

  test("Record construction fallbacks (kills survivors)", () => {
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

  test("respects startingFreezes and maxFreezes on initialization", () => {
    const policy = { ...basePolicy, startingFreezes: 10, maxFreezes: 5 };
    const res = calculateNextCheckin(
      null,
      null,
      policy,
      "now",
      "2026-03-01",
    );
    assert.strictEqual(res.nextInventory.balance, 5);
  });
});

describe("Core Streak Logic - Gap and Freeze Handling", () => {
  const last = createLastCheckin({ streakSequence: 10, streakDate: "2026-03-01" });
  const inv = createLastInventory({ balance: 5 });

  test("one day gap uses one freeze", () => {
    const res = calculateNextCheckin(last, inv, basePolicy, "now", "2026-03-03");
    assert.strictEqual(res.nextCheckin.streakSequence, 11);
    assert.strictEqual(res.nextCheckin.freezesClaimed, 1);
    assert.deepStrictEqual(res.nextCheckin.freezeDates, ["2026-03-02"]);
    assert.strictEqual(res.nextInventory.balance, 4);
    assert.strictEqual(res.nextInventory.action, "spend");
  });

  test("unfinished interval uses a freeze", () => {
    const lastUnf = { ...last, checkinsInInterval: 0 };
    const res = calculateNextCheckin(lastUnf, inv, basePolicy, "now", "2026-03-02");
    assert.strictEqual(res.nextCheckin.streakSequence, 11);
    assert.strictEqual(res.nextCheckin.freezesClaimed, 1);
    assert.strictEqual(res.nextInventory.balance, 4);
  });

  test("includeFreezesInStreak increases sequence by gap size", () => {
    const pInc = { ...basePolicy, includeFreezesInStreak: true };
    const res = calculateNextCheckin(last, inv, pInc, "now", "2026-03-04");
    // gaps: March 2, March 3. Sequence: 10 + 2 + 1 = 13
    assert.strictEqual(res.nextCheckin.streakSequence, 13);
  });

  test("grace period covers gaps exactly (kills survivors)", () => {
    const pGrace = { ...basePolicy, gracePeriodIntervals: 1 };
    const res = calculateNextCheckin(last, inv, pGrace, "now", "2026-03-03");
    assert.strictEqual(res.nextCheckin.freezesClaimed, 0, "Grace MUST cover 1 skip exactly");
    assert.strictEqual(res.nextInventory, null);
    assert.strictEqual(res.nextCheckin.streakSequence, 11);
  });

  test("streak resets if not enough freezes (precision check)", () => {
    const lowInv = { balance: 0 };
    const res = calculateNextCheckin(last, lowInv, basePolicy, "now", "2026-03-03");
    assert.strictEqual(res.nextCheckin.streakSequence, 1, "Broken streak must reset to exactly 1");
    assert.strictEqual(res.nextCheckin.freezesClaimed, 0);
    assert.strictEqual(res.nextInventory, null);
  });
});

describe("Core Streak Logic - Rewards", () => {
  const pReward = {
    ...basePolicy,
    milestones: [10],
    freezesGrantedAtMilestone: 2,
    intervalsToEarnFreeze: 5,
    maxFreezes: 10,
  };

  test("grants freezes at milestone", () => {
    const last = createLastCheckin({ streakSequence: 9 });
    const res = calculateNextCheckin(last, { balance: 0 }, pReward, "now", getNextDay(last.streakDate));
    // 2 from milestone + 1 from rate (10 % 5 === 0) = 3
    assert.strictEqual(res.nextInventory.balance, 3);
    assert.strictEqual(res.nextInventory.action, "earn");
  });

  test("grants freezes at recurring milestones", () => {
    const pRecurring = {
      ...basePolicy,
      milestones: [10],
      recurringMilestoneInterval: 5,
      freezesGrantedAtMilestone: 1,
    };
    // 10 is explicit. 15 should be recurring.
    const last = createLastCheckin({ streakSequence: 14, streakDate: "2026-03-01" });
    const res = calculateNextCheckin(last, { balance: 0 }, pRecurring, "now", "2026-03-02");
    assert.strictEqual(res.nextCheckin.streakSequence, 15);
    assert.strictEqual(res.nextInventory.balance, 1, "Should grant at recurring milestone 15");
  });
});

describe("Core Streak Logic - Validation", () => {
  test("throws when streakDate is missing in validation", () => {
    const checkins = [{ streakSequence: 1 }];
    assert.throws(() => validateCheckinSequence(checkins, basePolicy), /streakDate is mandatory/);
  });

  test("throws when streakDate is missing in next check-in calculation", () => {
    assert.throws(() => calculateNextCheckin({}, {}, basePolicy, "now", null), /streakDate is mandatory/);
  });
  test("validates a simple consecutive sequence", () => {
    const v1 = createLastCheckin({ streakSequence: 1, streakDate: "2026-03-01" });
    const v2 = createLastCheckin({ streakSequence: 2, streakDate: "2026-03-02", prev: "v1" });
    assert.ok(validateCheckinSequence([v1, v2], basePolicy));
  });

  test("validates sequence with gaps and freezes", () => {
    const v1 = createLastCheckin({ streakSequence: 1, streakDate: "2026-03-01" });
    const v2 = createLastCheckin({
      streakSequence: 2,
      streakDate: "2026-03-03",
      freezesClaimed: 1,
      freezeDates: ["2026-03-02"],
    });
    assert.ok(validateCheckinSequence([v1, v2], basePolicy));
  });

  test("validates an unordered sequence by sorting it", () => {
    const v1 = createLastCheckin({ streakSequence: 1, streakDate: "2026-03-01" });
    const v2 = createLastCheckin({ streakSequence: 2, streakDate: "2026-03-02" });
    // Pass in reverse order. It should sort by date and pass.
    assert.ok(validateCheckinSequence([v2, v1], basePolicy));
  });

  test("throws on sequence mismatch with precise message (kills survivors)", () => {
    const v1 = createLastCheckin({ streakSequence: 1, streakDate: "2026-03-01" });
    const v2 = createLastCheckin({ streakSequence: 5, streakDate: "2026-03-02" });
    assert.throws(
      () => validateCheckinSequence([v1, v2], basePolicy),
      /Streak sequence mismatch at check-in 1. Expected 2, got 5/
    );
  });

  test("throws on interval count mismatch with precise message (kills survivors)", () => {
    const v1 = createLastCheckin({ streakSequence: 1, streakDate: "2026-03-01", checkinsInInterval: 1 });
    const v2 = createLastCheckin({ streakSequence: 1, streakDate: "2026-03-01", checkinsInInterval: 1 });
    assert.throws(
      () => validateCheckinSequence([v1, v2], basePolicy),
      /Interval check-in count mismatch at check-in 1. Expected 2, got 1/
    );
  });
});

describe("Core Streak Logic - Claiming External Grants", () => {
  test("increases balance and respects maxFreezes", () => {
    const inv = createLastInventory({ balance: 1 });
    const res = calculateClaimInventory(inv, { count: 10, cid: "grant" }, { maxFreezes: 5 }, "now");
    assert.strictEqual(res.balance, 5);
    assert.strictEqual(res.action, "claim");
    assert.strictEqual(res.relatedFreezeGrant, "grant");
  });
});
