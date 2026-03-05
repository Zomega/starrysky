import assert from "assert";
import {
  calculateNextCheckin,
  getIntervalIndex,
  calculateClaimInventory,
} from "../labeler/src/streak-logic.js";

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
  testStartingFreezes();
  testIntervalIndex();
  testWeeklyTwoTimes();
  console.log("\nAll core logic tests passed! 🎉");
} catch (error) {
  console.error("\nTests failed! ❌");
  console.error(error);
  process.exit(1);
}
