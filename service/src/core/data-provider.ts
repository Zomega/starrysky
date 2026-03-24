import { Checkin, Inventory, Policy, GridData } from "./streak-logic.js";

export interface StreakSummary {
  subject: string;
  streakSequence: number;
  lastCheckinDate: string | null;
  balance: number;
}

export interface StreakDetail {
  policy: Policy;
  checkins: Checkin[];
  inventory: Inventory;
  gridData: GridData;
}

export interface StreakStatus {
  subject: string;
  streakSequence: number;
  balance: number;
  lastCheckinDate: string | null;
}

export abstract class StreakDataProvider {
  abstract getProfileStreaks(actor: string): Promise<StreakSummary[]>;
  abstract getStreakDetail(
    actor: string,
    subject: string,
    policyUri: string,
  ): Promise<StreakDetail>;
  abstract getStreakStatus(
    actor: string,
    subject: string,
  ): Promise<StreakStatus>;
}
