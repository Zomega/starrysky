/**
 * Core logic for Starrysky streaks.
 * Handles generation and validation of check-in and inventory records.
 */

/**
 * Returns a deterministic index for a given date based on cadence.
 * Uses UTC to avoid local timezone shifts.
 */
export function getIntervalIndex(date, cadence) {
  const d = new Date(date);
  const type = cadence.type;
  const resetDay = cadence.intervalResetDay || 0;

  if (type === "daily") {
    return Math.floor(d.getTime() / (24 * 60 * 60 * 1000));
  }

  if (type === "weekly") {
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    return Math.floor((d.getTime() - (resetDay - 4) * dayMs) / weekMs);
  }

  if (type === "monthly") {
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
  }

  if (type === "quarterly") {
    return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
  }

  if (type === "yearly") {
    return d.getUTCFullYear();
  }

  return 0;
}

/**
 * Calculates the state for the next check-in.
 */
export function calculateNextCheckin(
  lastCheckin,
  lastInventory,
  policy,
  currentTime,
) {
  const now = new Date(currentTime);
  const cadence = policy.cadence;
  const currentIntervalIdx = getIntervalIndex(now, cadence);

  // 1. Initial Check-in
  if (!lastCheckin) {
    const firstCheckin = {
      originService: policy.originService,
      policy: policy.uri || "at://placeholder",
      subject: policy.subject || "Default",
      streakSequence: 1,
      checkinsInInterval: 1,
      freezesClaimed: 0,
      createdAt: currentTime,
    };

    const firstInventory = lastInventory || {
      originService: policy.originService,
      policy: policy.uri || "at://placeholder",
      subject: policy.subject || "Default",
      action: "initialize",
      balance: Math.min(policy.startingFreezes || 0, policy.maxFreezes || 3),
      createdAt: currentTime,
    };

    return { nextCheckin: firstCheckin, nextInventory: firstInventory };
  }

  const lastIntervalIdx = getIntervalIndex(
    new Date(lastCheckin.createdAt),
    cadence,
  );
  const intervalsPassed = currentIntervalIdx - lastIntervalIdx;

  const currentBalance = lastInventory ? lastInventory.balance : 0;

  let streakSequence = lastCheckin.streakSequence;
  let checkinsInInterval = 1;
  let freezesClaimed = 0;
  let newBalance = currentBalance;
  let inventoryAction = null;

  if (intervalsPassed === 0) {
    checkinsInInterval = (lastCheckin.checkinsInInterval || 0) + 1;
  } else if (intervalsPassed === 1) {
    if (lastCheckin.checkinsInInterval < cadence.requiredCheckinsPerInterval) {
      const freezesNeeded = 1;
      if (currentBalance >= freezesNeeded) {
        freezesClaimed = freezesNeeded;
        newBalance -= freezesClaimed;
        inventoryAction = "spend";
        streakSequence = policy.includeFreezesInStreak
          ? streakSequence + 2
          : streakSequence + 1;
      } else {
        streakSequence = 1;
      }
    } else {
      streakSequence += 1;
    }
    checkinsInInterval = 1;
  } else {
    const missedIntervals = intervalsPassed - 1;
    const extraNeeded =
      lastCheckin.checkinsInInterval < cadence.requiredCheckinsPerInterval
        ? 1
        : 0;
    const totalFreezesNeeded = missedIntervals + extraNeeded;

    if (totalFreezesNeeded <= currentBalance) {
      freezesClaimed = totalFreezesNeeded;
      newBalance -= freezesClaimed;
      inventoryAction = "spend";
      streakSequence = policy.includeFreezesInStreak
        ? streakSequence + totalFreezesNeeded + 1
        : streakSequence + 1;
    } else {
      sequence = 1;
    }
    checkinsInInterval = 1;
  }

  // Freeze Granting
  let totalFreezesEarned = 0;

  const reachedMilestone =
    isMilestoneLogic(streakSequence, policy) && intervalsPassed > 0;
  if (reachedMilestone) {
    totalFreezesEarned += policy.freezesGrantedAtMilestone || 0;
  }

  const reachedRate =
    policy.intervalsToEarnFreeze > 0 &&
    streakSequence % policy.intervalsToEarnFreeze === 0 &&
    intervalsPassed > 0;
  if (reachedRate) {
    totalFreezesEarned += 1;
  }

  if (totalFreezesEarned > 0) {
    newBalance = Math.min(
      newBalance + totalFreezesEarned,
      policy.maxFreezes || 3,
    );
    inventoryAction = inventoryAction === "spend" ? "spend_and_earn" : "earn";
  }

  const nextCheckin = {
    originService: lastCheckin.originService || policy.originService,
    policy: lastCheckin.policy,
    subject: lastCheckin.subject,
    streakSequence: streakSequence,
    checkinsInInterval: checkinsInInterval,
    freezesClaimed: freezesClaimed,
    prev: lastCheckin.cid || "placeholder-cid",
    createdAt: currentTime,
  };

  let nextInventory = null;
  if (inventoryAction) {
    nextInventory = {
      originService: lastCheckin.originService || policy.originService,
      policy: lastCheckin.policy,
      subject: lastCheckin.subject,
      prev: lastInventory ? lastInventory.cid : null,
      action: inventoryAction.includes("earn") ? "earn" : "spend",
      balance: newBalance,
      relatedCheckin: "placeholder-cid-of-next-checkin", // Real CID would be calculated after signing
      createdAt: currentTime,
    };
  }

  return { nextCheckin, nextInventory };
}

/**
 * Generates an inventory record for claiming an external freezegrant.
 */
export function calculateClaimInventory(
  lastInventory,
  freezeGrant,
  policy,
  currentTime,
) {
  const currentBalance = lastInventory ? lastInventory.balance : 0;
  const grantCount = freezeGrant.count || 1;
  const max = policy.maxFreezes || 3;

  const newBalance = Math.min(currentBalance + grantCount, max);

  return {
    originService: lastInventory.originService,
    policy: lastInventory.policy,
    subject: lastInventory.subject,
    prev: lastInventory.cid || null,
    action: "claim",
    balance: newBalance,
    relatedFreezeGrant: freezeGrant.cid || "grant-cid",
    createdAt: currentTime,
  };
}

function isMilestoneLogic(count, policy) {
  if (count <= 0) return false;
  if (policy.milestones && policy.milestones.includes(count)) return true;
  if (policy.recurringMilestoneInterval) {
    const lastExplicit = policy.milestones ? Math.max(...policy.milestones) : 0;
    if (count > lastExplicit) {
      return (count - lastExplicit) % policy.recurringMilestoneInterval === 0;
    }
  }
  return false;
}

export function validateCheckinSequence(checkins, policy) {
  if (!checkins || checkins.length === 0) return true;
  const sorted = [...checkins].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  const cadence = policy.cadence;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const lastIdx = getIntervalIndex(new Date(prev.createdAt), cadence);
    const currIdx = getIntervalIndex(new Date(curr.createdAt), cadence);
    const passed = currIdx - lastIdx;

    let expectedStreakSequence = prev.streakSequence;
    let expectedCheckinsInInterval = 1;

    if (passed === 0) {
      expectedCheckinsInInterval = prev.checkinsInInterval + 1;
    } else {
      const missed = passed - 1;
      const unfinished =
        prev.checkinsInInterval < cadence.requiredCheckinsPerInterval ? 1 : 0;
      const needed = missed + unfinished;

      if (curr.freezesClaimed === needed) {
        expectedStreakSequence =
          prev.streakSequence +
          (policy.includeFreezesInStreak ? needed + 1 : 1);
      } else {
        expectedStreakSequence = 1;
      }
      expectedCheckinsInInterval = 1;
    }

    if (curr.streakSequence !== expectedStreakSequence) {
      throw new Error(
        `Streak sequence mismatch at check-in ${i}. Expected ${expectedStreakSequence}, got ${curr.streakSequence}`,
      );
    }
    if (curr.checkinsInInterval !== expectedCheckinsInInterval) {
      throw new Error(
        `Interval check-in count mismatch at check-in ${i}. Expected ${expectedCheckinsInInterval}, got ${curr.checkinsInInterval}`,
      );
    }
  }

  return true;
}
