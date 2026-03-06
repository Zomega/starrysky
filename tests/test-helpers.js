/**
 * Shared test utilities and builders for Starrysky streak logic tests.
 */

export const basePolicy = {
  originService: "app.test",
  cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
  gracePeriodIntervals: 0,
  maxFreezes: 5,
  includeFreezesInStreak: false,
  startingFreezes: 0,
  uri: "at://policy",
  subject: "My Streak",
};

export function buildPolicy(overrides = {}) {
  return {
    ...basePolicy,
    ...overrides,
  };
}

export function createLastCheckin(overrides = {}) {
  return {
    streakSequence: 1,
    streakDate: "2026-03-01",
    checkinsInInterval: 1,
    cid: "prev-c",
    policy: "at://policy",
    subject: "My Streak",
    ...overrides,
  };
}

export function createLastInventory(overrides = {}) {
  return {
    balance: 0,
    cid: "prev-i",
    policy: "at://policy",
    subject: "My Streak",
    ...overrides,
  };
}

export function getNextDay(dateStr) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

export function getDaysLater(dateStr, days) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}
