import assert from "assert";
import {
  calculateNextCheckin,
  getIntervalIndex,
} from "../labeler/src/streak-logic.js";

function testIntervalIndex() {
  console.log("Testing getIntervalIndex...");
  const daily = { type: "daily" };
  assert.strictEqual(
    getIntervalIndex("2026-03-01T12:00:00Z", daily),
    getIntervalIndex("2026-03-01T23:59:59Z", daily),
  );

  const weeklyMon = { type: "weekly", intervalResetDay: 1 };
  assert.notStrictEqual(
    getIntervalIndex("2026-03-01T12:00:00Z", weeklyMon),
    getIntervalIndex("2026-03-02T12:00:00Z", weeklyMon),
  );

  const monthly = { type: "monthly" };
  assert.strictEqual(
    getIntervalIndex("2026-03-01T12:00:00Z", monthly),
    getIntervalIndex("2026-03-31T12:00:00Z", monthly),
  );
  assert.notStrictEqual(
    getIntervalIndex("2026-03-31T12:00:00Z", monthly),
    getIntervalIndex("2026-04-01T12:00:00Z", monthly),
  );

  const quarterly = { type: "quarterly" };
  assert.strictEqual(
    getIntervalIndex("2026-01-01T12:00:00Z", quarterly),
    getIntervalIndex("2026-03-31T12:00:00Z", quarterly),
  );
  assert.notStrictEqual(
    getIntervalIndex("2026-03-31T12:00:00Z", quarterly),
    getIntervalIndex("2026-04-01T12:00:00Z", quarterly),
  );

  const yearly = { type: "yearly" };
  assert.strictEqual(
    getIntervalIndex("2026-01-01T12:00:00Z", yearly),
    getIntervalIndex("2026-12-31T12:00:00Z", yearly),
  );
  assert.notStrictEqual(
    getIntervalIndex("2026-12-31T12:00:00Z", yearly),
    getIntervalIndex("2027-01-01T12:00:00Z", yearly),
  );

  console.log("✅ getIntervalIndex passed");
}

function testWeeklyTwoTimes() {
  console.log("Testing weekly 2x streak...");
  const policy = {
    cadence: {
      type: "weekly",
      requiredCheckinsPerInterval: 2,
      intervalResetDay: 1,
    },
    intervalsToEarnFreeze: 0,
    includeFreezesInStreak: false,
  };
  const res1 = calculateNextCheckin(null, null, policy, "2026-03-02T12:00:00Z");
  assert.strictEqual(res1.nextCheckin.streakSequence, 1);
  assert.strictEqual(res1.nextCheckin.checkinsInInterval, 1);
  const res2 = calculateNextCheckin(
    res1.nextCheckin,
    res1.nextInventory,
    policy,
    "2026-03-03T12:00:00Z",
  );
  assert.strictEqual(res2.nextCheckin.streakSequence, 1);
  assert.strictEqual(res2.nextCheckin.checkinsInInterval, 2);
  console.log("✅ Weekly 2x passed");
}

function testMilestoneFreezeGrant() {
  console.log("Testing milestone freeze grant...");
  const policy = {
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    milestones: [5],
    freezesGrantedAtMilestone: 2,
    maxFreezes: 3,
    intervalsToEarnFreeze: 0,
  };
  const lastCheckin = {
    streakSequence: 4,
    checkinsInInterval: 1,
    createdAt: "2026-03-04T12:00:00Z",
  };
  const inventory = { balance: 0 };
  const res = calculateNextCheckin(
    lastCheckin,
    inventory,
    policy,
    "2026-03-05T12:00:00Z",
  );
  assert.strictEqual(res.nextCheckin.streakSequence, 5);
  assert.strictEqual(res.nextInventory.balance, 2);
  console.log("✅ Milestone freeze grant passed");
}

try {
  testIntervalIndex();
  testWeeklyTwoTimes();
  testMilestoneFreezeGrant();
  console.log("\nAll core logic tests passed! 🎉");
} catch (error) {
  console.error("\nTests failed! ❌");
  console.error(error);
  process.exit(1);
}
