/**
 * Core logic for Starrysky streaks.
 * Handles generation and validation of check-in and inventory records.
 */

export interface Cadence {
  type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  requiredCheckinsPerInterval: number;
  intervalResetDay?: number;
}

export interface Policy {
  uri?: string;
  name: string;
  originService?: string;
  verificationType: "self-reported" | "witnessed";
  allowedWitnesses?: string[];
  allowedGranters?: string[];
  cadence: Cadence;
  intervalsToEarnFreeze: number;
  maxFreezes?: number;
  gracePeriodIntervals?: number;
  startingFreezes?: number;
  includeFreezesInStreak?: boolean;
  milestones?: number[];
  recurringMilestoneInterval?: number;
  freezesGrantedAtMilestone?: number;
  createdAt?: string;
  subject?: string;
}

export interface Checkin {
  cid?: string;
  originService: string;
  policy: string;
  subject: string;
  streakSequence: number;
  streakDate: string;
  checkinsInInterval: number;
  note?: string;
  value?: number;
  prev?: string;
  inventoryRef?: string;
  freezeDates?: string[];
  freezesClaimed?: number; // Internal helper for logic, not in lexicon but used in calculation
  icons?: string[]; // Used in mockup
  createdAt: string;
}

export interface Inventory {
  cid?: string;
  originService: string;
  policy: string;
  subject: string;
  prev?: string | null;
  action: "earn" | "spend" | "initialize" | "claim" | "spend_and_earn";
  balance: number;
  relatedCheckin?: string;
  relatedFreezeGrant?: string;
  createdAt: string;
}

export interface FreezeGrant {
  cid?: string;
  count?: number;
}

/**
 * Returns a deterministic index for a given date based on cadence.
 * Uses UTC to avoid local timezone shifts.
 */
export function getIntervalIndex(
  date: Date | string,
  cadence: Cadence,
): number {
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
  lastCheckin: Checkin | null,
  lastInventory: Inventory | null,
  policy: Policy,
  currentTime: string,
  streakDate: string,
): { nextCheckin: Checkin; nextInventory: Inventory | null } {
  if (!streakDate) {
    throw new Error("streakDate is mandatory for all check-ins.");
  }

  const now = new Date(streakDate);
  const cadence = policy.cadence;
  const currentIntervalIdx = getIntervalIndex(now, cadence);

  // Initial Check-in
  if (!lastCheckin) {
    const firstCheckin: Checkin = {
      originService: policy.originService || "at://placeholder",
      policy: policy.uri || "at://placeholder",
      subject: policy.subject || "Default",
      streakSequence: 1,
      streakDate: streakDate,
      checkinsInInterval: 1,
      freezeDates: [],
      freezesClaimed: 0,
      createdAt: currentTime,
    };

    const firstInventory: Inventory = lastInventory || {
      originService: policy.originService || "at://placeholder",
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
  let freezeDates: string[] = [];
  let freezesNeeded = 0;
  let newBalance = currentBalance;
  let inventoryAction: Inventory["action"] | null = null;

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

  const nextCheckin: Checkin = {
    originService:
      lastCheckin.originService || policy.originService || "at://placeholder",
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

  let nextInventory: Inventory | null = null;
  if (inventoryAction) {
    nextInventory = {
      originService:
        lastCheckin.originService || policy.originService || "at://placeholder",
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
  lastInventory: Inventory,
  freezeGrant: FreezeGrant,
  policy: Policy,
  currentTime: string,
): Inventory {
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
export function isMilestone(count: number, policy: Policy): boolean {
  if (count <= 0) return false;
  if (policy.milestones && policy.milestones.includes(count)) return true;
  if (
    policy.recurringMilestoneInterval &&
    policy.recurringMilestoneInterval > 0
  ) {
    const lastExplicit =
      policy.milestones && policy.milestones.length > 0
        ? Math.max(...policy.milestones)
        : 0;
    if (count > lastExplicit) {
      return (count - lastExplicit) % policy.recurringMilestoneInterval === 0;
    }
  }
  return false;
}

/**
 * Validates a sequence of check-ins against a policy and optional inventory history.
 * Throws on mismatch.
 */
export function validateCheckinSequence(
  checkins: Checkin[],
  policy: Policy,
  inventories?: Inventory[],
): boolean {
  if (!checkins || checkins.length === 0) return true;

  for (const c of checkins) {
    if (!c.streakDate) {
      throw new Error("streakDate is mandatory for all check-in records.");
    }
  }

  const sortedCheckins = [...checkins].sort(
    (a, b) =>
      new Date(a.streakDate).getTime() - new Date(b.streakDate).getTime(),
  );

  const sortedInventories = inventories
    ? [...inventories].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    : null;

  const cadence = policy.cadence;
  const grace = policy.gracePeriodIntervals || 0;

  for (let i = 1; i < sortedCheckins.length; i++) {
    const prev = sortedCheckins[i - 1];
    const curr = sortedCheckins[i];

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
        // If we have inventory history, verify the user actually HAD the balance at the time of check-in
        if (sortedInventories && claimed > 0) {
          // Find the latest inventory record BEFORE or AT the check-in time
          const checkinTime = new Date(curr.createdAt).getTime();
          const lastInvBefore = [...sortedInventories]
            .reverse()
            .find((inv) => new Date(inv.createdAt).getTime() <= checkinTime);

          // The inventory record linked to this check-in should have a balance
          // that reflects the spend. A real validator would check the 'relatedCheckin'
          // pointer and the balance transition.
          if (!lastInvBefore || lastInvBefore.balance < 0) {
            throw new Error(`Insufficient freeze balance at check-in ${i}.`);
          }

          // Basic verification: does any inventory record actually mention this check-in?
          const spendingInv = sortedInventories.find(
            (inv) =>
              inv.relatedCheckin === curr.cid ||
              (inv.action === "spend" && inv.createdAt === curr.createdAt),
          );
          if (!spendingInv && claimed > 0) {
            // In a strict mode, we'd throw. For now, let's at least check the latest balance.
            if (lastInvBefore.balance < 0) {
              throw new Error(`Insufficient freeze balance at check-in ${i}.`);
            }
          }
        }

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

export interface GridData {
  activeIndices: number[];
  frozenIndices: number[];
  graceIndices: number[];
  brokenIndices: number[];
  perfectWeekIndices: number[];
  customIconMap: Map<number, string[]>;
}

/**
 * Returns grid metadata for a range of dates.
 */
export function getGridDataForRange(
  checkins: Checkin[],
  subject: string,
  startDateStr: string,
  endDateStr: string,
): GridData {
  const activeIndices: number[] = [];
  const frozenIndices: number[] = [];
  const graceIndices: number[] = [];
  const brokenIndices: number[] = [];
  const perfectWeekIndices: number[] = [];
  const customIconMap = new Map<number, string[]>(); // idx -> [icons]
  const dayMs = 24 * 60 * 60 * 1000;

  const start = new Date(startDateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setUTCHours(0, 0, 0, 0);

  const relevantCheckins = checkins
    .filter((c) => c.subject === subject)
    .sort(
      (a, b) =>
        new Date(a.streakDate).getTime() - new Date(b.streakDate).getTime(),
    );

  const dayMap = new Map<number, "active" | "frozen" | "grace" | "broken">();

  let lastCheckinDate: string | null = null;

  relevantCheckins.forEach((c) => {
    const ts = new Date(c.streakDate + "T00:00:00Z").getTime();
    const idxInRange = Math.floor((ts - start.getTime()) / dayMs);

    if (ts >= start.getTime() && ts <= end.getTime()) {
      dayMap.set(ts, "active");
      if (c.icons && c.icons.length > 0) {
        customIconMap.set(idxInRange, c.icons);
      }
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
            if (c.streakSequence > 1) {
              dayMap.set(gapTs, "grace");
            } else {
              // Streak broke. Mark the first day of the gap as broken.
              const firstGapDayTs = lastTs + dayMs;
              if (
                gapTs === firstGapDayTs &&
                firstGapDayTs >= start.getTime() &&
                firstGapDayTs <= end.getTime()
              ) {
                dayMap.set(firstGapDayTs, "broken");
              }
            }
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
    else if (status === "broken") brokenIndices.push(idx);

    currTs += dayMs;
    idx++;
  }

  // Identify perfect weeks (Sunday to Saturday all active)
  for (let i = 0; i < idx; i++) {
    const d = new Date(start.getTime() + i * dayMs);
    if (d.getUTCDay() === 0) {
      // Sunday. Check if the next 7 days are all active.
      let allActive = true;
      for (let j = 0; j < 7; j++) {
        if (
          i + j >= idx ||
          dayMap.get(start.getTime() + (i + j) * dayMs) !== "active"
        ) {
          allActive = false;
          break;
        }
      }
      if (allActive) {
        // Place icon in the middle of the week (Wednesday = idx + 3)
        perfectWeekIndices.push(i + 3);
      }
    }
  }

  return {
    activeIndices,
    frozenIndices,
    graceIndices,
    brokenIndices,
    perfectWeekIndices,
    customIconMap,
  };
}

/**
 * Returns the number of days in a month.
 */
export function getDaysInMonth(year: number, month: number): number[] {
  const date = new Date(Date.UTC(year, month, 1));
  const days: number[] = [];
  while (date.getUTCMonth() === month) {
    days.push(date.getUTCDate());
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

/**
 * Returns milestones relevant to a current count.
 */
export function getMilestonesForPolicy(
  currentCount: number,
  policy: Policy,
): number[] {
  let milestones = [0, ...(policy.milestones || [])];

  const lastExplicit =
    policy.milestones && policy.milestones.length > 0
      ? Math.max(...policy.milestones)
      : 0;
  if (
    policy.recurringMilestoneInterval &&
    policy.recurringMilestoneInterval > 0
  ) {
    let nextRecur = lastExplicit + policy.recurringMilestoneInterval;
    while (nextRecur <= currentCount + policy.recurringMilestoneInterval) {
      milestones.push(nextRecur);
      nextRecur += policy.recurringMilestoneInterval;
    }
  }

  const nextGoalIdx = milestones.findIndex((m) => m > currentCount);
  if (nextGoalIdx === -1) return milestones.slice(-1); // Safety fallback

  const startIndex = Math.max(0, nextGoalIdx - 3);
  return milestones.slice(startIndex, nextGoalIdx + 1);
}

/**
 * Generates a sequence of check-ins for demo/testing purposes.
 */
export function generateCheckinHistory(
  policy: Policy,
  startDateStr: string,
  endDateStr: string,
  skipDates: string[] = [],
  customIcons: Record<string, string[]> = {}, // dateStr -> [icons]
): { checkins: Checkin[]; inventory: Inventory | null } {
  let currentCheckin: Checkin | null = null;
  let currentInventory: Inventory | null = null;
  const history: Checkin[] = [];

  const curr = new Date(startDateStr);
  curr.setUTCHours(12, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setUTCHours(12, 0, 0, 0);

  while (curr <= end) {
    const dateStr = curr.toISOString().split("T")[0];
    if (!skipDates.includes(dateStr)) {
      const result = calculateNextCheckin(
        currentCheckin,
        currentInventory,
        policy,
        curr.toISOString(),
        dateStr,
      );
      if (customIcons[dateStr]) {
        result.nextCheckin.icons = customIcons[dateStr];
      }
      history.push(result.nextCheckin);
      currentCheckin = result.nextCheckin;
      if (result.nextInventory) currentInventory = result.nextInventory;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return { checkins: history, inventory: currentInventory };
}
