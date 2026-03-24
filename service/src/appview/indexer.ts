import { Jetstream } from "@skyware/jetstream";
import WebSocket from "ws";
import { StreakDb } from "../core/db.ts";

export class StreakIndexer {
  private jetstream: Jetstream;
  private db: StreakDb;

  constructor(db: StreakDb) {
    this.db = db;
    this.jetstream = new Jetstream({
      ws: WebSocket as any,
      wantedCollections: [
        "app.starrysky.streak.checkin",
        "app.starrysky.streak.inventory",
        "app.starrysky.streak.policy",
      ],
    });

    this.init();
  }

  private init() {
    this.jetstream.onCreate("app.starrysky.streak.checkin", (event) =>
      this.handleUpsert(event),
    );
    this.jetstream.onUpdate("app.starrysky.streak.checkin", (event) =>
      this.handleUpsert(event),
    );
    this.jetstream.onDelete("app.starrysky.streak.checkin", (event) =>
      this.handleDelete(event),
    );

    this.jetstream.onCreate("app.starrysky.streak.inventory", (event) =>
      this.handleUpsert(event),
    );
    this.jetstream.onUpdate("app.starrysky.streak.inventory", (event) =>
      this.handleUpsert(event),
    );
    this.jetstream.onDelete("app.starrysky.streak.inventory", (event) =>
      this.handleDelete(event),
    );

    this.jetstream.onCreate("app.starrysky.streak.policy", (event) =>
      this.handleUpsert(event),
    );
    this.jetstream.onUpdate("app.starrysky.streak.policy", (event) =>
      this.handleUpsert(event),
    );
    this.jetstream.onDelete("app.starrysky.streak.policy", (event) =>
      this.handleDelete(event),
    );
  }

  private handleUpsert(event: any) {
    const { did, commit } = event;
    const { collection, rkey, record, cid } = commit;
    const uri = `at://${did}/${collection}/${rkey}`;

    console.log(`[Indexer] Upserting ${uri}`);
    this.db.upsertRecord(uri, cid, did, collection, rkey, record);
  }

  private handleDelete(event: any) {
    const { did, commit } = event;
    const { collection, rkey } = commit;
    const uri = `at://${did}/${collection}/${rkey}`;

    console.log(`[Indexer] Deleting ${uri}`);
    this.db.deleteRecord(uri);
  }

  public start() {
    console.log("🔭 Streak Indexer starting...");
    this.jetstream.start();
  }
}
