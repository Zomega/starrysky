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
    // Unix epoch 1970-01-01 was a Thursday (4).
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
 * streakDate (YYYY-MM-DD) is mandatory.
 */
export function calculateNextCheckin(
  lastCheckin,
  lastInventory,
  policy,
  currentTime,
  streakDate,
) {
  if (!streakDate) {
    throw new Error("streakDate is mandatory for all check-ins.");
  }

  const now = new Date(streakDate);
  const cadence = policy.cadence;
  const currentIntervalIdx = getIntervalIndex(now, cadence);

  // Initial Check-in
  if (!lastCheckin) {
    const firstCheckin = {
      originService: policy.originService,
      policy: policy.uri || "at://placeholder",
      subject: policy.subject || "Default",
      streakSequence: 1,
      streakDate: streakDate,
      checkinsInInterval: 1,
      freezeDates: [],
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

  const lastDate = new Date(lastCheckin.streakDate);
  const lastIntervalIdx = getIntervalIndex(lastDate, cadence);
  const intervalsPassed = currentIntervalIdx - lastIntervalIdx;

  const currentBalance = lastInventory ? lastInventory.balance : 0;

  let streakSequence = lastCheckin.streakSequence;
  let checkinsInInterval = 1;
  let freezeDates = [];
  let freezesNeeded = 0;
  let newBalance = currentBalance;
  let inventoryAction = null;

  if (intervalsPassed === 0) {
    checkinsInInterval = (lastCheckin.checkinsInInterval || 0) + 1;
  } else {
    const unfinishedPrev =
      lastCheckin.checkinsInInterval < cadence.requiredCheckinsPerInterval
        ? 1
        : 0;
    const totalGaps = Math.max(0, intervalsPassed - 1) + unfinishedPrev;
    const grace = policy.gracePeriodIntervals || 0;
    freezesNeeded = Math.max(0, totalGaps - grace);

    if (freezesNeeded <= currentBalance) {
      if (freezesNeeded > 0) {
        inventoryAction = "spend";
        if (cadence.type === "daily") {
          for (let i = 1; i <= freezesNeeded; i++) {
            const fDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            freezeDates.push(fDate.toISOString().split("T")[0]);
          }
        }
      }

      newBalance -= freezesNeeded;

      if (policy.includeFreezesInStreak) {
        streakSequence += totalGaps + 1;
      } else {
        streakSequence += 1;
      }
    } else {
      streakSequence = 1;
      freezesNeeded = 0;
    }
    checkinsInInterval = 1;
  }

  // Freeze Granting Logic
  let totalFreezesEarned = 0;
  if (isMilestone(streakSequence, policy) && intervalsPassed > 0) {
    totalFreezesEarned += policy.freezesGrantedAtMilestone || 0;
  }
  if (
    policy.intervalsToEarnFreeze > 0 &&
    streakSequence % policy.intervalsToEarnFreeze === 0 &&
    intervalsPassed > 0
  ) {
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
    streakDate: streakDate,
    checkinsInInterval: checkinsInInterval,
    freezeDates: freezeDates,
    freezesClaimed: freezesNeeded,
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
      action: inventoryAction,
      balance: newBalance,
      relatedCheckin: "placeholder-cid-of-next-checkin",
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

/**
 * Checks if a count is a milestone according to a policy.
 */
export function isMilestone(count, policy) {
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

/**
 * Validates a sequence of check-ins against a policy.
 * Throws on mismatch.
 */
export function validateCheckinSequence(checkins, policy) {
  if (!checkins || checkins.length === 0) return true;

  for (const c of checkins) {
    if (!c.streakDate) {
      throw new Error("streakDate is mandatory for all check-in records.");
    }
  }

  const sorted = [...checkins].sort(
    (a, b) => new Date(a.streakDate) - new Date(b.streakDate),
  );
  const cadence = policy.cadence;
  const grace = policy.gracePeriodIntervals || 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevDate = new Date(prev.streakDate);
    const currDate = new Date(curr.streakDate);

    const lastIdx = getIntervalIndex(prevDate, cadence);
    const currIdx = getIntervalIndex(currDate, cadence);
    const passed = currIdx - lastIdx;

    let expectedSeq = prev.streakSequence;
    let expectedCount = 1;

    if (passed === 0) {
      expectedCount = prev.checkinsInInterval + 1;
    } else {
      const unfinishedPrev =
        prev.checkinsInInterval < cadence.requiredCheckinsPerInterval ? 1 : 0;
      const totalGaps = Math.max(0, passed - 1) + unfinishedPrev;
      const needed = Math.max(0, totalGaps - grace);

      const claimed = curr.freezesClaimed || 0;

      if (claimed === needed) {
        expectedSeq =
          prev.streakSequence +
          (policy.includeFreezesInStreak ? totalGaps + 1 : 1);
      } else {
        expectedSeq = 1;
      }
      expectedCount = 1;
    }

    if (curr.streakSequence !== expectedSeq) {
      throw new Error(
        `Streak sequence mismatch at check-in ${i}. Expected ${expectedSeq}, got ${curr.streakSequence}`,
      );
    }
    if (curr.checkinsInInterval !== expectedCount) {
      throw new Error(
        `Interval check-in count mismatch at check-in ${i}. Expected ${expectedCount}, got ${curr.checkinsInInterval}`,
      );
    }
  }

  return true;
}

/**
 * Returns grid metadata for a range of dates.
 */
export function getGridDataForRange(
  checkins,
  subject,
  startDateStr,
  endDateStr,
) {
  const activeIndices = [];
  const frozenIndices = [];
  const graceIndices = [];
  const dayMs = 24 * 60 * 60 * 1000;

  const start = new Date(startDateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setUTCHours(0, 0, 0, 0);

  const relevantCheckins = checkins
    .filter((c) => c.subject === subject)
    .sort((a, b) => new Date(a.streakDate) - new Date(b.streakDate));

  const dayMap = new Map();

  let lastCheckinDate = null;

  relevantCheckins.forEach((c) => {
    const ts = new Date(c.streakDate + "T00:00:00Z").getTime();

    if (ts >= start.getTime() && ts <= end.getTime()) {
      dayMap.set(ts, "active");
    }

    if (c.freezeDates && c.freezeDates.length > 0) {
      c.freezeDates.forEach((fd) => {
        const fts = new Date(fd + "T00:00:00Z").getTime();
        if (fts >= start.getTime() && fts <= end.getTime()) {
          if (dayMap.get(fts) !== "active") {
            dayMap.set(fts, "frozen");
          }
        }
      });
    }

    if (lastCheckinDate !== null) {
      const lastTs = new Date(lastCheckinDate + "T00:00:00Z").getTime();
      let gapTs = ts - dayMs;
      while (gapTs > lastTs) {
        if (!dayMap.has(gapTs)) {
          if (gapTs >= start.getTime() && gapTs <= end.getTime()) {
            dayMap.set(gapTs, "grace");
          }
        }
        gapTs -= dayMs;
      }
    }

    lastCheckinDate = c.streakDate;
  });

  let currTs = start.getTime();
  let idx = 0;
  while (currTs <= end.getTime()) {
    const status = dayMap.get(currTs);
    if (status === "active") activeIndices.push(idx);
    else if (status === "frozen") frozenIndices.push(idx);
    else if (status === "grace") graceIndices.push(idx);

    currTs += dayMs;
    idx++;
  }

  return { activeIndices, frozenIndices, graceIndices };
}

/**
 * Returns the number of days in a month.
 */
export function getDaysInMonth(year, month) {
  const date = new Date(Date.UTC(year, month, 1));
  const days = [];
  while (date.getUTCMonth() === month) {
    days.push(date.getUTCDate());
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

/**
 * Returns milestones relevant to a current count.
 */
export function getMilestonesForPolicy(currentCount, policy) {
  let milestones = [0, ...(policy.milestones || [])];

  const lastExplicit = policy.milestones ? Math.max(...policy.milestones) : 0;
  if (policy.recurringMilestoneInterval) {
    let nextRecur = lastExplicit + policy.recurringMilestoneInterval;
    while (nextRecur <= currentCount + policy.recurringMilestoneInterval) {
      milestones.push(nextRecur);
      nextRecur += policy.recurringMilestoneInterval;
    }
  }

  const nextGoalIdx = milestones.findIndex((m) => m > currentCount);
  const startIndex = Math.max(0, nextGoalIdx - 3);
  return milestones.slice(startIndex, nextGoalIdx + 1);
}
