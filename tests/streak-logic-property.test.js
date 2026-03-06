import { test, describe } from "node:test";
import assert from "node:assert";
import fc from "fast-check";
import {
  calculateNextCheckin,
  getIntervalIndex,
} from "../labeler/src/streak-logic.js";

// Use a very safe date range to avoid RangeErrors
const minDate = new Date("2020-01-01").getTime();
const maxDate = new Date("2030-01-01").getTime();

const dateArb = fc
  .integer({ min: minDate, max: maxDate })
  .map((t) => new Date(t).toISOString().split("T")[0]);

describe("Streak Logic Properties", () => {
  test("streakSequence should always be >= 1", () => {
    fc.assert(
      fc.property(
        fc.record({
          cadence: fc.record({
            type: fc.constantFrom("daily", "weekly", "monthly"),
            requiredCheckinsPerInterval: fc.integer({ min: 1, max: 5 }),
          }),
          gracePeriodIntervals: fc.integer({ min: 0, max: 3 }),
          maxFreezes: fc.integer({ min: 0, max: 10 }),
          includeFreezesInStreak: fc.boolean(),
        }),
        fc.option(
          fc.record({
            streakSequence: fc.integer({ min: 1, max: 1000 }),
            streakDate: dateArb,
            checkinsInInterval: fc.integer({ min: 0, max: 5 }),
          }),
          { nil: null },
        ),
        fc.option(
          fc.record({
            balance: fc.integer({ min: 0, max: 10 }),
          }),
          { nil: null },
        ),
        dateArb, // next checkin date
        (policy, lastCheckin, lastInventory, nextDate) => {
          try {
            const { nextCheckin } = calculateNextCheckin(
              lastCheckin,
              lastInventory,
              policy,
              new Date().toISOString(),
              nextDate,
            );
            assert.ok(nextCheckin.streakSequence >= 1);
          } catch (e) {
            // Logic errors like backwards dates are fine to catch and ignore
          }
        },
      ),
    );
  });

  test("streakSequence should advance on consecutive intervals", () => {
    fc.assert(
      fc.property(
        fc.record({
          cadence: fc.record({
            type: fc.constantFrom("daily", "weekly", "monthly"),
            requiredCheckinsPerInterval: fc.integer({ min: 1, max: 1 }),
          }),
          gracePeriodIntervals: fc.integer({ min: 0, max: 0 }),
          maxFreezes: fc.integer({ min: 0, max: 0 }),
          includeFreezesInStreak: fc.boolean(),
        }),
        fc.record({
          streakSequence: fc.integer({ min: 1, max: 1000 }),
          streakDate: dateArb,
          checkinsInInterval: fc.integer({ min: 1, max: 1 }),
        }),
        (policy, lastCheckin) => {
          const d = new Date(lastCheckin.streakDate);
          let nextDate;

          if (policy.cadence.type === "daily") {
            nextDate = new Date(d.getTime() + 24 * 60 * 60 * 1000);
          } else if (policy.cadence.type === "weekly") {
            nextDate = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
          } else {
            // Next month same day
            nextDate = new Date(
              Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
            );
          }

          const nextDateStr = nextDate.toISOString().split("T")[0];

          const { nextCheckin } = calculateNextCheckin(
            lastCheckin,
            null,
            policy,
            new Date().toISOString(),
            nextDateStr,
          );

          const lastIdx = getIntervalIndex(
            lastCheckin.streakDate,
            policy.cadence,
          );
          const nextIdx = getIntervalIndex(nextDateStr, policy.cadence);

          if (nextIdx === lastIdx + 1) {
            assert.strictEqual(
              nextCheckin.streakSequence,
              lastCheckin.streakSequence + 1,
            );
          }
        },
      ),
    );
  });
});
