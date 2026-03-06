import assert from "assert";
import {
  calculateNextCheckin,
  getIntervalIndex,
  calculateClaimInventory,
  validateCheckinSequence,
} from "../labeler/src/streak-logic.js";

function testAbsolute100() {
  console.log("Absolute 100% Branch Coverage Pursuit Starting...");

  const basePoly = {
    originService: "app.test",
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    gracePeriodIntervals: 0,
    maxFreezes: 5,
    includeFreezesInStreak: false,
  };

  // --- calculateNextCheckin Initial branches (Lines 64-79) ---
  // Line 70: lastInventory provided vs null
  const resNullInv = calculateNextCheckin(
    null,
    null,
    basePoly,
    "now",
    "2026-03-01",
  );
  const resProvInv = calculateNextCheckin(
    null,
    { balance: 10, cid: "p" },
    basePoly,
    "now",
    "2026-03-01",
  );
  assert.strictEqual(resProvInv.nextInventory.balance, 10);

  // Line 76: startingFreezes provided vs undefined
  const pStartProv = { ...basePoly, startingFreezes: 2 };
  const resStartProv = calculateNextCheckin(
    null,
    null,
    pStartProv,
    "now",
    "2026-03-01",
  );
  assert.strictEqual(resStartProv.nextInventory.balance, 2);
  const pStartDef = { cadence: { type: "daily" } };
  const resStartDef = calculateNextCheckin(
    null,
    null,
    pStartDef,
    "now",
    "2026-03-01",
  );
  assert.strictEqual(resStartDef.nextInventory.balance, 0);

  // Line 76: maxFreezes provided vs default 3
  const pMaxProv = {
    cadence: { type: "daily" },
    maxFreezes: 5,
    startingFreezes: 10,
  };
  const resMaxProv = calculateNextCheckin(
    null,
    null,
    pMaxProv,
    "now",
    "2026-03-01",
  );
  assert.strictEqual(resMaxProv.nextInventory.balance, 5);

  // --- Gaps ---
  const init = resNullInv.nextCheckin;
  // Line 100: lastCheckin.checkinsInInterval provided vs falsy
  const cProv = {
    streakSequence: 1,
    streakDate: "2026-03-01",
    checkinsInInterval: 1,
  };
  calculateNextCheckin(cProv, null, basePoly, "now", "2026-03-01");
  const cFalsy = { streakSequence: 1, streakDate: "2026-03-01" }; // undefined
  calculateNextCheckin(cFalsy, null, basePoly, "now", "2026-03-01");

  // Line 126: includeFreezesInStreak truthy vs falsy
  calculateNextCheckin(
    init,
    { balance: 1 },
    { ...basePoly, includeFreezesInStreak: true },
    "now",
    "2026-03-03",
  );
  calculateNextCheckin(
    init,
    { balance: 1 },
    { ...basePoly, includeFreezesInStreak: false },
    "now",
    "2026-03-03",
  );

  // --- Rewards ---
  // Line 141: intervalsToEarnFreeze > 0 vs <= 0
  calculateNextCheckin(
    cProv,
    null,
    { ...basePoly, intervalsToEarnFreeze: 2 },
    "now",
    "2026-03-02",
  );
  calculateNextCheckin(
    cProv,
    null,
    { ...basePoly, intervalsToEarnFreeze: 0 },
    "now",
    "2026-03-02",
  );

  // Line 154: lastCheckin.originService provided vs falsy
  const cOrigProv = { ...cProv, originService: "custom" };
  const resOrigProv = calculateNextCheckin(
    cOrigProv,
    null,
    basePoly,
    "now",
    "2026-03-02",
  );
  assert.strictEqual(resOrigProv.nextCheckin.originService, "custom");
  const cOrigFalsy = { ...cProv };
  const resOrigFalsy = calculateNextCheckin(
    cOrigFalsy,
    null,
    basePoly,
    "now",
    "2026-03-02",
  );
  assert.strictEqual(resOrigFalsy.nextCheckin.originService, "app.test");

  // Line 178: lastInventory provided vs null
  const invProv = { balance: 0, cid: "i-cid" };
  calculateNextCheckin(
    cProv,
    invProv,
    { ...basePoly, milestones: [2], freezesGrantedAtMilestone: 1 },
    "now",
    "2026-03-02",
  );
  calculateNextCheckin(
    cProv,
    null,
    { ...basePoly, milestones: [2], freezesGrantedAtMilestone: 1 },
    "now",
    "2026-03-02",
  );

  // --- calculateClaimInventory (Lines 194-211) ---
  // Line 198: grant.count provided vs default 1
  const invBasic = {
    balance: 0,
    originService: "a",
    policy: "b",
    subject: "c",
  };
  calculateClaimInventory(invBasic, { count: 5 }, { maxFreezes: 10 }, "now");
  calculateClaimInventory(invBasic, {}, { maxFreezes: 10 }, "now");

  // Line 200: lastInventory.cid provided vs null
  calculateClaimInventory(
    { ...invBasic, cid: "my-cid" },
    {},
    { maxFreezes: 5 },
    "now",
  );
  calculateClaimInventory(invBasic, {}, { maxFreezes: 5 }, "now");

  // --- isMilestoneLogic (Lines 213-225) ---
  // Line 213: milestones provided vs falsy
  calculateNextCheckin(
    cProv,
    null,
    { ...basePoly, milestones: [2], freezesGrantedAtMilestone: 1 },
    "now",
    "2026-03-02",
  );
  calculateNextCheckin(
    cProv,
    null,
    {
      ...basePoly,
      recurringMilestoneInterval: 5,
      freezesGrantedAtMilestone: 1,
    },
    "now",
    "2026-03-02",
  );

  // Line 219: lastExplicit calc (policy.milestones truthy vs falsy)
  const pMileRec = {
    ...basePoly,
    milestones: [2],
    recurringMilestoneInterval: 5,
    freezesGrantedAtMilestone: 1,
  };
  calculateNextCheckin(
    { streakSequence: 6, streakDate: "2026-03-01", checkinsInInterval: 1 },
    null,
    pMileRec,
    "now",
    "2026-03-02",
  );

  // --- validateCheckinSequence (Lines 230-290) ---
  // Line 264: passed === 0 vs !== 0
  const vSame = [cProv, { ...cProv, checkinsInInterval: 2 }];
  validateCheckinSequence(vSame, basePoly);
  const vDiff = [
    cProv,
    { ...cProv, streakDate: "2026-03-02", streakSequence: 2 },
  ];
  validateCheckinSequence(vDiff, basePoly);

  // Line 273: curr.freezesClaimed provided vs falsy
  const vFreezeProv = [
    cProv,
    {
      ...cProv,
      streakDate: "2026-03-03",
      streakSequence: 2,
      freezesClaimed: 1,
    },
  ];
  validateCheckinSequence(vFreezeProv, basePoly);
  const vFreezeFalsy = [
    cProv,
    { ...cProv, streakDate: "2026-03-02", streakSequence: 2 },
  ];
  validateCheckinSequence(vFreezeFalsy, basePoly);

  // Failure branches
  assert.throws(
    () =>
      validateCheckinSequence(
        [cProv, { ...cProv, streakDate: "2026-03-02", streakSequence: 5 }],
        basePoly,
      ),
    /mismatch/i,
  );
  assert.throws(
    () =>
      validateCheckinSequence(
        [cProv, { ...cProv, streakDate: "2026-03-01", checkinsInInterval: 5 }],
        basePoly,
      ),
    /mismatch/i,
  );

  // All Cadences Exhaustion
  getIntervalIndex("2026-03-01", { type: "daily" });
  getIntervalIndex("2026-03-01", { type: "weekly", intervalResetDay: 1 });
  getIntervalIndex("2026-03-01", { type: "weekly" });
  getIntervalIndex("2026-03-01", { type: "monthly" });
  getIntervalIndex("2026-03-01", { type: "quarterly" });
  getIntervalIndex("2026-01-01", { type: "yearly" });
  getIntervalIndex("2026-01-01", {});

  console.log("\n🚀 ABSOLUTE 100% PASS!");
}

try {
  testAbsolute100();
} catch (e) {
  console.error("\n❌ FAILED!");
  console.error(e);
  process.exit(1);
}
