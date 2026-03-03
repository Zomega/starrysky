/**
 * Core logic for Starrysky streaks.
 * Handles generation and validation of check-in and inventory records.
 */

/**
 * Calculates the state for the next check-in.
 *
 * @param {Object|null} lastCheckin - The previous check-in record (null if first).
 * @param {Object|null} lastInventory - The previous inventory record (null if first).
 * @param {Object} policy - The policy record defining the rules.
 * @param {string} currentTime - ISO timestamp of the new check-in.
 * @returns {Object} { nextCheckin, nextInventory }
 */
export function calculateNextCheckin(
  lastCheckin,
  lastInventory,
  policy,
  currentTime,
) {
  const now = new Date(currentTime);
  const windowMs = (policy.windowSeconds || 86400) * 1000;

  // 1. Initial Check-in
  if (!lastCheckin) {
    const firstCheckin = {
      service: policy.service,
      policy: policy.uri || "at://placeholder",
      subject: policy.subject || "Default",
      sequence: 1,
      freezesClaimed: 0,
      createdAt: currentTime,
    };

    // Initial inventory if none exists
    const firstInventory = lastInventory || {
      service: policy.service,
      policy: policy.uri || "at://placeholder",
      subject: policy.subject || "Default",
      action: "initialize",
      balance: 0,
      createdAt: currentTime,
    };

    return { nextCheckin: firstCheckin, nextInventory: firstInventory };
  }

  const lastDate = new Date(lastCheckin.createdAt);
  const diffMs = now.getTime() - lastDate.getTime();

  // Calculate missed windows
  // 0-24h: 0 freezes
  // 24h-48h: 1 freeze
  // etc.
  const freezesNeeded = Math.floor((diffMs - 1) / windowMs);

  const currentBalance = lastInventory ? lastInventory.balance : 0;

  let sequence = lastCheckin.sequence;
  let freezesClaimed = 0;
  let newBalance = currentBalance;
  let inventoryAction = null;

  if (freezesNeeded > 0) {
    if (freezesNeeded <= currentBalance) {
      // Bridge the gap
      freezesClaimed = freezesNeeded;
      newBalance -= freezesClaimed;
      inventoryAction = "spend";

      if (policy.includeFreezesInStreak) {
        sequence += freezesClaimed + 1;
      } else {
        sequence += 1;
      }
    } else {
      // Streak broken!
      sequence = 1;
      freezesClaimed = 0;
    }
  } else {
    // Consecutive check-in within the same window
    sequence += 1;
  }

  // Check if we earned a new freeze
  if (
    sequence % policy.freezeGrantRate === 0 &&
    newBalance < (policy.maxFreezes || 3)
  ) {
    newBalance += 1;
    inventoryAction = inventoryAction === "spend" ? "spend_and_earn" : "earn";
  }

  const nextCheckin = {
    service: lastCheckin.service,
    policy: lastCheckin.policy,
    subject: lastCheckin.subject,
    sequence: sequence,
    freezesClaimed: freezesClaimed,
    prev: lastCheckin.cid || "placeholder-cid",
    createdAt: currentTime,
  };

  let nextInventory = null;
  if (inventoryAction) {
    nextInventory = {
      service: lastCheckin.service,
      policy: lastCheckin.policy,
      subject: lastCheckin.subject,
      action: inventoryAction.includes("earn") ? "earn" : "spend",
      balance: newBalance,
      createdAt: currentTime,
    };
  }

  return { nextCheckin, nextInventory };
}

/**
 * Validates a sequence of check-ins against a policy.
 */
export function validateCheckinSequence(checkins, policy) {
  if (!checkins || checkins.length === 0) return true;

  const sorted = [...checkins].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  const windowMs = (policy.windowSeconds || 86400) * 1000;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const diffMs =
      new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
    const freezesNeeded = Math.floor((diffMs - 1) / windowMs);

    let expectedSequence;
    if (freezesNeeded > 0) {
      if (curr.freezesClaimed === freezesNeeded) {
        expectedSequence =
          prev.sequence +
          (policy.includeFreezesInStreak ? freezesNeeded + 1 : 1);
      } else {
        expectedSequence = 1;
      }
    } else {
      expectedSequence = prev.sequence + 1;
    }

    if (curr.sequence !== expectedSequence) {
      throw new Error(
        `Sequence mismatch at check-in ${i}. Expected ${expectedSequence}, got ${curr.sequence}`,
      );
    }

    if (
      freezesNeeded > 0 &&
      curr.freezesClaimed > 0 &&
      curr.freezesClaimed > freezesNeeded
    ) {
      throw new Error(
        `Over-claimed freezes at check-in ${i}. Missed ${freezesNeeded}, claimed ${curr.freezesClaimed}`,
      );
    }
  }

  return true;
}
