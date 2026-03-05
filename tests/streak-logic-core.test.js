import assert from "assert";
import {
  calculateNextCheckin,
  getIntervalIndex,
} from "../labeler/src/streak-logic.js";

function testLargeGapCombined() {
  console.log("Testing large gap with grace period and multiple freezes...");
  const policy = {
    gracePeriodIntervals: 2,
    maxFreezes: 10,
    originService: "app.test",
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    includeFreezesInStreak: false,
  };

  const lastCheckin = {
    streakSequence: 10,
    streakDate: "2026-03-01",
    checkinsInInterval: 1,
    createdAt: "2026-03-01T12:00:00Z",
  };
  const inventory = { balance: 10 };

  // Gap of 7 days (Mar 2, 3, 4, 5, 6, 7, 8), checking in on Mar 9.
  // Gaps = 7. Grace = 2.
  // Freezes needed = 7 - 2 = 5.
  const res = calculateNextCheckin(
    lastCheckin,
    inventory,
    policy,
    "2026-03-09T12:00:00Z",
    "2026-03-09",
  );

  assert.strictEqual(res.nextCheckin.streakSequence, 11);
  assert.strictEqual(res.nextCheckin.freezesClaimed, 5);
  // Should have frozen the 5 days closest to the new checkin: Mar 4, 5, 6, 7, 8
  // (Wait, my logic freezes i=1 to freezesNeeded... let's check)
  // for (let i = 1; i <= 5; i++) { fDate = now - i days }
  // i=1: Mar 8, i=2: Mar 7, i=3: Mar 6, i=4: Mar 5, i=5: Mar 4.
  assert.deepStrictEqual(res.nextCheckin.freezeDates, [
    "2026-03-08",
    "2026-03-07",
    "2026-03-06",
    "2026-03-05",
    "2026-03-04",
  ]);
  assert.strictEqual(res.nextInventory.balance, 5);

  console.log("✅ Large gap grace/freeze passed");
}

function testGraceAndFreezeCombined() {
  console.log("Testing combined grace period and freezes...");
  const policy = {
    gracePeriodIntervals: 2,
    maxFreezes: 3,
    originService: "app.test",
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    includeFreezesInStreak: false,
  };
  const lastCheckin = {
    streakSequence: 10,
    streakDate: "2026-03-01",
    checkinsInInterval: 1,
    createdAt: "2026-03-01T12:00:00Z",
  };
  const inventory = { balance: 1 };
  const res = calculateNextCheckin(
    lastCheckin,
    inventory,
    policy,
    "2026-03-05T12:00:00Z",
    "2026-03-05",
  );
  assert.strictEqual(res.nextCheckin.streakSequence, 11);
  assert.strictEqual(res.nextCheckin.freezesClaimed, 1);
  assert.deepStrictEqual(res.nextCheckin.freezeDates, ["2026-03-04"]);
  assert.strictEqual(res.nextInventory.balance, 0);
  console.log("✅ Combined grace/freeze passed");
}

function testExplicitDates() {
  console.log("Testing mandatory streakDate and freezeDates...");
  const policy = {
    originService: "app.test",
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    includeFreezesInStreak: false,
  };
  const lastCheckin = {
    streakSequence: 1,
    streakDate: "2026-03-01",
    checkinsInInterval: 1,
    createdAt: "2026-03-01T23:59:00Z",
  };
  const inventory = { balance: 1 };
  const res = calculateNextCheckin(
    lastCheckin,
    inventory,
    policy,
    "2026-03-03T01:00:00Z",
    "2026-03-03",
  );
  assert.strictEqual(res.nextCheckin.streakSequence, 2);
  assert.strictEqual(res.nextCheckin.streakDate, "2026-03-03");
  assert.deepStrictEqual(res.nextCheckin.freezeDates, ["2026-03-02"]);
  console.log("✅ Explicit dates passed");
}

function testGracePeriod() {
  console.log("Testing grace period...");
  const policy = {
    gracePeriodIntervals: 2,
    originService: "app.test",
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    includeFreezesInStreak: false,
  };
  const lastCheckin = {
    streakSequence: 5,
    streakDate: "2026-03-01",
    checkinsInInterval: 1,
    createdAt: "2026-03-01T12:00:00Z",
  };
  const inventory = { balance: 0 };
  const res = calculateNextCheckin(
    lastCheckin,
    inventory,
    policy,
    "2026-03-03T12:00:00Z",
    "2026-03-03",
  );
  assert.strictEqual(res.nextCheckin.streakSequence, 6);
  assert.strictEqual(res.nextCheckin.freezesClaimed, 0);
  console.log("✅ Grace period passed");
}

function testStartingFreezes() {
  console.log("Testing starting freezes...");
  const policy = {
    startingFreezes: 2,
    maxFreezes: 3,
    originService: "app.test",
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
  };
  const { nextInventory } = calculateNextCheckin(
    null,
    null,
    policy,
    "2026-03-01T12:00:00Z",
    "2026-03-01",
  );
  assert.strictEqual(nextInventory.balance, 2);
  console.log("✅ Starting freezes passed");
}

function testIntervalIndex() {
  console.log("Testing getIntervalIndex...");
  const daily = { type: "daily" };
  assert.strictEqual(
    getIntervalIndex("2026-03-01T12:00:00Z", daily),
    getIntervalIndex("2026-03-01T23:59:59Z", daily),
  );
  console.log("✅ getIntervalIndex passed");
}

try {
  testLargeGapCombined();
  testGraceAndFreezeCombined();
  testExplicitDates();
  testGracePeriod();
  testStartingFreezes();
  testIntervalIndex();
  console.log("\nAll core logic tests passed! 🎉");
} catch (error) {
  console.error("\nTests failed! ❌");
  console.error(error);
  process.exit(1);
}
