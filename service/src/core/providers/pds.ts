import {
  StreakDataProvider,
  StreakSummary,
  StreakDetail,
  StreakStatus,
} from "../data-provider.js";
import {
  Checkin,
  Inventory,
  Policy,
  getGridDataForRange,
} from "../streak-logic.js";

export class PdsDataProvider extends StreakDataProvider {
  constructor(private pdsUrl: string = "https://bsky.social") {
    super();
  }

  private async listRecords(repo: string, collection: string): Promise<any[]> {
    const url = new URL("/xrpc/com.atproto.repo.listRecords", this.pdsUrl);
    url.searchParams.append("repo", repo);
    url.searchParams.append("collection", collection);
    url.searchParams.append("limit", "100");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Failed to list records: ${res.statusText}`);
    const data = await res.json();
    return data.records.map((r: any) => ({
      ...r.value,
      cid: r.cid,
      uri: r.uri,
    }));
  }

  async getProfileStreaks(actor: string): Promise<StreakSummary[]> {
    const [checkins, inventories] = await Promise.all([
      this.listRecords(actor, "app.starrysky.streak.checkin"),
      this.listRecords(actor, "app.starrysky.streak.inventory"),
    ]);

    const subjects = [...new Set(checkins.map((c) => c.subject))];

    return subjects.map((subject) => {
      const subCheckins = (checkins as Checkin[])
        .filter((c) => c.subject === subject)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

      const subInventories = (inventories as Inventory[])
        .filter((i) => i.subject === subject)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

      const latestCheckin = subCheckins[subCheckins.length - 1];
      const latestInventory = subInventories[subInventories.length - 1];

      return {
        subject,
        streakSequence: latestCheckin ? latestCheckin.streakSequence : 0,
        lastCheckinDate: latestCheckin ? latestCheckin.streakDate : null,
        balance: latestInventory ? latestInventory.balance : 0,
      };
    });
  }

  async getStreakDetail(
    actor: string,
    subject: string,
    policyUri: string,
  ): Promise<StreakDetail> {
    const [checkins, inventories, policies] = await Promise.all([
      this.listRecords(actor, "app.starrysky.streak.checkin"),
      this.listRecords(actor, "app.starrysky.streak.inventory"),
      this.listRecords(actor, "app.starrysky.streak.policy"),
    ]);

    const subCheckins = (checkins as Checkin[])
      .filter((c) => c.subject === subject)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    const subInventories = (inventories as Inventory[])
      .filter((i) => i.subject === subject)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    const policy =
      (policies as Policy[]).find((p) => p.uri === policyUri) ||
      (policies[0] as Policy);
    const latestInventory = subInventories[subInventories.length - 1];

    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const gridData = getGridDataForRange(
      subCheckins,
      subject,
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
    );

    const fallbackInventory: Inventory = {
      originService: "unknown",
      policy: policyUri,
      subject,
      action: "initialize",
      balance: 0,
      createdAt: new Date().toISOString(),
    };

    return {
      policy,
      checkins: subCheckins,
      inventory: latestInventory || fallbackInventory,
      gridData,
    };
  }

  async getStreakStatus(actor: string, subject: string): Promise<StreakStatus> {
    const summary = await this.getProfileStreaks(actor);
    const sub = summary.find((s) => s.subject === subject);

    return {
      subject,
      streakSequence: sub ? sub.streakSequence : 0,
      balance: sub ? sub.balance : 0,
      lastCheckinDate: sub ? sub.lastCheckinDate : null,
    };
  }
}
