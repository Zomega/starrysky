import {
  StreakDataProvider,
  StreakSummary,
  StreakDetail,
  StreakStatus,
} from "../data-provider.js";
import {
  generateCheckinHistory,
  getGridDataForRange,
  Policy,
  Checkin,
  Inventory,
} from "../streak-logic.js";

export const MOCK_POLICIES: Record<string, Policy> = {
  Wordle: {
    name: "Wordle",
    originService: "app.starrysky",
    milestones: [1, 3, 7, 10, 25, 50, 75, 100, 200, 300],
    recurringMilestoneInterval: 100,
    freezesGrantedAtMilestone: 1,
    intervalsToEarnFreeze: 0,
    includeFreezesInStreak: false,
    maxFreezes: 5,
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    verificationType: "self-reported",
    uri: "at://policy/wordle",
    subject: "Wordle",
  },
  "Tiled Words": {
    name: "Tiled Words",
    originService: "app.starrysky",
    milestones: [5, 10, 25, 50],
    recurringMilestoneInterval: 50,
    freezesGrantedAtMilestone: 0,
    intervalsToEarnFreeze: 7,
    includeFreezesInStreak: true,
    maxFreezes: 5,
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    verificationType: "self-reported",
    uri: "at://policy/tiled-words",
    subject: "Tiled Words",
  },
  Connections: {
    name: "Connections",
    originService: "app.starrysky",
    milestones: [7, 14, 21, 28],
    recurringMilestoneInterval: 28,
    freezesGrantedAtMilestone: 1,
    intervalsToEarnFreeze: 0,
    includeFreezesInStreak: false,
    maxFreezes: 2,
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    verificationType: "self-reported",
    uri: "at://policy/connections",
    subject: "Connections",
  },
  Crossword: {
    name: "Crossword",
    originService: "app.starrysky",
    milestones: [1, 5, 10, 25, 50, 100],
    recurringMilestoneInterval: 100,
    freezesGrantedAtMilestone: 1,
    intervalsToEarnFreeze: 10,
    includeFreezesInStreak: false,
    maxFreezes: 3,
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    verificationType: "self-reported",
    uri: "at://policy/crossword",
    subject: "Crossword",
  },
  Chess: {
    name: "Chess",
    originService: "com.chess",
    milestones: [10, 50, 100],
    recurringMilestoneInterval: 100,
    freezesGrantedAtMilestone: 0,
    intervalsToEarnFreeze: 0,
    includeFreezesInStreak: false,
    maxFreezes: 0,
    gracePeriodIntervals: 2,
    cadence: { type: "daily", requiredCheckinsPerInterval: 1 },
    verificationType: "self-reported",
    uri: "at://policy/chess",
    subject: "Chess",
  },
};

const wordleData = generateCheckinHistory(
  MOCK_POLICIES.Wordle,
  "2025-01-01",
  "2026-02-28",
  ["2026-01-21", "2026-02-16", "2026-02-24"],
  {
    "2026-02-28": ["verified"],
    "2026-02-27": ["verified"],
  },
);

const tiledWordsData = generateCheckinHistory(
  MOCK_POLICIES["Tiled Words"],
  "2026-02-01",
  "2026-02-28",
  ["2026-02-25"],
);

const connectionsHistoryJan = generateCheckinHistory(
  MOCK_POLICIES.Connections,
  "2026-01-01",
  "2026-01-10",
  [],
);
const connectionsHistoryFeb = generateCheckinHistory(
  MOCK_POLICIES.Connections,
  "2026-02-15",
  "2026-02-28",
  ["2026-02-20", "2026-02-21"],
);

const crosswordData = generateCheckinHistory(
  MOCK_POLICIES.Crossword,
  "2026-02-15",
  "2026-02-28",
  ["2026-02-22", "2026-02-24", "2026-02-26", "2026-02-27"],
  {
    "2026-02-28": ["fitness_center"],
  },
);

const chessData = generateCheckinHistory(
  MOCK_POLICIES.Chess,
  "2026-02-01",
  "2026-02-28",
  ["2026-02-10", "2026-02-11", "2026-02-22", "2026-02-23"],
);

export const MOCK_CHECKINS: Checkin[] = [
  ...wordleData.checkins,
  ...tiledWordsData.checkins,
  ...connectionsHistoryJan.checkins,
  ...connectionsHistoryFeb.checkins,
  ...crosswordData.checkins,
  ...chessData.checkins,
];

export const MOCK_INVENTORY: Record<string, Inventory> = {
  Wordle: wordleData.inventory!,
  "Tiled Words": tiledWordsData.inventory!,
  Connections: connectionsHistoryFeb.inventory!,
  Crossword: crosswordData.inventory!,
  Chess: chessData.inventory!,
};

export class MockDataProvider extends StreakDataProvider {
  async getProfileStreaks(actor: string): Promise<StreakSummary[]> {
    const subjects = Object.keys(MOCK_POLICIES);
    return subjects.map((subject) => {
      const checkins = MOCK_CHECKINS.filter((c) => c.subject === subject);
      const latestCheckin = checkins[checkins.length - 1];
      const inventory = MOCK_INVENTORY[subject];
      return {
        subject,
        streakSequence: latestCheckin ? latestCheckin.streakSequence : 0,
        lastCheckinDate: latestCheckin ? latestCheckin.streakDate : null,
        balance: inventory ? inventory.balance : 0,
      };
    });
  }

  async getStreakDetail(
    actor: string,
    subject: string,
    policyUri: string,
  ): Promise<StreakDetail> {
    const policy = MOCK_POLICIES[subject];
    const checkins = MOCK_CHECKINS.filter((c) => c.subject === subject);
    const inventory = MOCK_INVENTORY[subject];

    const end = new Date("2026-02-28");
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const gridData = getGridDataForRange(
      checkins,
      subject,
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
    );

    return {
      policy,
      checkins,
      inventory,
      gridData,
    };
  }

  async getStreakStatus(actor: string, subject: string): Promise<StreakStatus> {
    const checkins = MOCK_CHECKINS.filter((c) => c.subject === subject);
    const latestCheckin = checkins[checkins.length - 1];
    const inventory = MOCK_INVENTORY[subject];

    return {
      subject,
      streakSequence: latestCheckin ? latestCheckin.streakSequence : 0,
      balance: inventory ? inventory.balance : 0,
      lastCheckinDate: latestCheckin ? latestCheckin.streakDate : null,
    };
  }
}
