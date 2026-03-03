import assert from "assert";
import {
  calculateNextCheckin,
  validateCheckinSequence,
} from "../labeler/src/streak-logic.js";

const mockPolicy = {
  service: "app.starrysky",
  subject: "Test",
  windowSeconds: 86400,
  freezeGrantRate: 5,
  maxFreezes: 3,
  includeFreezesInStreak: false,
};

function testInitialCheckin() {
  console.log("Testing initial checkin...");
  const { nextCheckin, nextInventory } = calculateNextCheckin(
    null,
    null,
    mockPolicy,
    "2026-03-01T12:00:00Z",
  );

  assert.strictEqual(nextCheckin.sequence, 1);
  assert.strictEqual(nextCheckin.freezesClaimed, 0);
  assert.strictEqual(nextInventory.balance, 0);
  console.log("✅ Initial checkin passed");
}

function testConsecutiveCheckin() {
  console.log("Testing consecutive checkin...");
  const lastCheckin = {
    sequence: 1,
    createdAt: "2026-03-01T12:00:00Z",
    service: "app.starrysky",
    subject: "Test",
  };
  const lastInventory = { balance: 0 };

  const { nextCheckin } = calculateNextCheckin(
    lastCheckin,
    lastInventory,
    mockPolicy,
    "2026-03-02T12:00:00Z",
  );

  assert.strictEqual(nextCheckin.sequence, 2);
  assert.strictEqual(nextCheckin.freezesClaimed, 0);
  console.log("✅ Consecutive checkin passed");
}

function testFreezeBridging() {
  console.log("Testing freeze bridging (includeFreezesInStreak: false)...");
  const lastCheckin = {
    sequence: 1,
    createdAt: "2026-03-01T12:00:00Z",
    service: "app.starrysky",
    subject: "Test",
  };
  const lastInventory = { balance: 2 };

  const { nextCheckin, nextInventory } = calculateNextCheckin(
    lastCheckin,
    lastInventory,
    mockPolicy,
    "2026-03-03T12:00:00Z",
  );

  assert.strictEqual(nextCheckin.freezesClaimed, 1);
  assert.strictEqual(nextCheckin.sequence, 2);
  assert.strictEqual(nextInventory.balance, 1);
  console.log("✅ Freeze bridging (exclude) passed");
}

function testFreezeBridgingInclude() {
  console.log("Testing freeze bridging (includeFreezesInStreak: true)...");
  const inclusivePolicy = { ...mockPolicy, includeFreezesInStreak: true };
  const lastCheckin = {
    sequence: 1,
    createdAt: "2026-03-01T12:00:00Z",
    service: "app.starrysky",
    subject: "Test",
  };
  const lastInventory = { balance: 2 };

  // Checking in 48h later. Missed 1 day.
  // Streak sequence should be: 1 (start) + 1 (frozen day) + 1 (new checkin) = 3
  const { nextCheckin } = calculateNextCheckin(
    lastCheckin,
    lastInventory,
    inclusivePolicy,
    "2026-03-03T12:00:00Z",
  );

  assert.strictEqual(nextCheckin.freezesClaimed, 1);
  assert.strictEqual(nextCheckin.sequence, 3);
  console.log("✅ Freeze bridging (include) passed");
}

function testEarnFreeze() {
  console.log("Testing earn freeze...");
  const lastCheckin = {
    sequence: 4,
    createdAt: "2026-03-04T12:00:00Z",
    service: "app.starrysky",
    subject: "Test",
  };
  const lastInventory = { balance: 0 };

  const { nextCheckin, nextInventory } = calculateNextCheckin(
    lastCheckin,
    lastInventory,
    mockPolicy,
    "2026-03-05T12:00:00Z",
  );

  assert.strictEqual(nextCheckin.sequence, 5);
  assert.strictEqual(nextInventory.action, "earn");
  assert.strictEqual(nextInventory.balance, 1);
  console.log("✅ Earn freeze passed");
}

function testStreakBreak() {
  console.log("Testing streak break...");
  const lastCheckin = {
    sequence: 10,
    createdAt: "2026-03-01T12:00:00Z",
    service: "app.starrysky",
    subject: "Test",
  };
  const lastInventory = { balance: 0 };

  const { nextCheckin } = calculateNextCheckin(
    lastCheckin,
    lastInventory,
    mockPolicy,
    "2026-03-03T12:00:00Z",
  );

  assert.strictEqual(nextCheckin.sequence, 1);
  assert.strictEqual(nextCheckin.freezesClaimed, 0);
  console.log("✅ Streak break passed");
}

function testValidation() {
  console.log("Testing sequence validation...");
  const checkins = [
    { sequence: 1, createdAt: "2026-03-01T12:00:00Z", freezesClaimed: 0 },
    { sequence: 2, createdAt: "2026-03-02T12:00:00Z", freezesClaimed: 0 },
    { sequence: 3, createdAt: "2026-03-04T12:00:00Z", freezesClaimed: 1 },
  ];

  assert.strictEqual(validateCheckinSequence(checkins, mockPolicy), true);

  const invalidCheckins = [
    { sequence: 1, createdAt: "2026-03-01T12:00:00Z", freezesClaimed: 0 },
    { sequence: 3, createdAt: "2026-03-02T12:00:00Z", freezesClaimed: 0 },
  ];

  assert.throws(
    () => validateCheckinSequence(invalidCheckins, mockPolicy),
    /Sequence mismatch/,
  );
  console.log("✅ Sequence validation passed");
}

try {
  testInitialCheckin();
  testConsecutiveCheckin();
  testFreezeBridging();
  testFreezeBridgingInclude();
  testEarnFreeze();
  testStreakBreak();
  testValidation();
  console.log("\nAll core logic tests passed successfully! 🎉");
} catch (error) {
  console.error("\nTests failed! ❌");
  console.error(error);
  process.exit(1);
}
