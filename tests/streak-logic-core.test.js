import assert from "assert";
import {
  calculateNextCheckin,
  getIntervalIndex,
  calculateClaimInventory,
} from "../labeler/src/streak-logic.js";

function testGracePeriod() {
  console.log("Testing grace period...");
  const policy = {
    gracePeriodIntervals: 2,
    maxFreezes: 3,
    originService: "app.test",
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    includeFreezesInStreak: false,
  };

  const lastCheckin = {
    streakSequence: 5,
    checkinsInInterval: 1,
    createdAt: "2026-03-01T12:00:00Z",
  };
  const inventory = { balance: 0 };

  // Miss 1 day (Mar 2), check in on Mar 3. Gap is 1. Grace is 2.
  // Should NOT use freeze, sequence should become 6.
  const res = calculateNextCheckin(
    lastCheckin,
    inventory,
    policy,
    "2026-03-03T12:00:00Z",
  );

  assert.strictEqual(res.nextCheckin.streakSequence, 6);
  assert.strictEqual(res.nextCheckin.freezesClaimed, 0);
  assert.strictEqual(res.nextInventory, null);

  // Miss 3 days (Mar 4, 5, 6), check in on Mar 7. Gap is 3. Grace is 2. Needs 1 freeze.
  const inventoryWithFreeze = { balance: 1 };
  const res2 = calculateNextCheckin(
    res.nextCheckin,
    inventoryWithFreeze,
    policy,
    "2026-03-07T12:00:00Z",
  );
  assert.strictEqual(res2.nextCheckin.freezesClaimed, 1);
  assert.strictEqual(res2.nextCheckin.streakSequence, 7);

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
  const res2 = calculateNextCheckin(
    res1.nextCheckin,
    res1.nextInventory,
    policy,
    "2026-03-03T12:00:00Z",
  );
  assert.strictEqual(res2.nextCheckin.streakSequence, 1);
  console.log("✅ Weekly 2x passed");
}

try {
  testGracePeriod();
  testStartingFreezes();
  testIntervalIndex();
  testWeeklyTwoTimes();
  console.log("\nAll core logic tests passed! 🎉");
} catch (error) {
  console.error("\nTests failed! ❌");
  console.error(error);
  process.exit(1);
}
