import assert from "assert";
import {
  calculateNextCheckin,
  getIntervalIndex,
  calculateClaimInventory,
} from "../labeler/src/streak-logic.js";

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
  const inventory = { balance: 0, cid: "inv-4" };

  const res = calculateNextCheckin(
    lastCheckin,
    inventory,
    policy,
    "2026-03-05T12:00:00Z",
  );
  assert.strictEqual(res.nextCheckin.streakSequence, 5);
  assert.strictEqual(res.nextInventory.balance, 2);
  assert.strictEqual(res.nextInventory.prev, "inv-4");
  assert.ok(res.nextInventory.relatedCheckin);
  console.log("✅ Milestone freeze grant passed");
}

function testClaimGrant() {
  console.log("Testing freezegrant claiming...");
  const policy = { maxFreezes: 5 };
  const lastInventory = {
    originService: "app.test",
    policy: "at://policy",
    subject: "Test",
    balance: 1,
    cid: "inv-prev",
  };
  const grant = { count: 2, cid: "grant-123" };

  const nextInv = calculateClaimInventory(
    lastInventory,
    grant,
    policy,
    "2026-03-06T12:00:00Z",
  );

  assert.strictEqual(nextInv.action, "claim");
  assert.strictEqual(nextInv.balance, 3);
  assert.strictEqual(nextInv.relatedFreezeGrant, "grant-123");
  assert.strictEqual(nextInv.prev, "inv-prev");

  console.log("✅ Freezegrant claiming passed");
}

try {
  testIntervalIndex();
  testWeeklyTwoTimes();
  testMilestoneFreezeGrant();
  testClaimGrant();
  console.log("\nAll refactored core logic tests passed! 🎉");
} catch (error) {
  console.error("\nTests failed! ❌");
  console.error(error);
  process.exit(1);
}
