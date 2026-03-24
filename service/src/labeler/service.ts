import { StreakDb } from "../core/db.ts";
import {
  validateCheckinSequence,
  Checkin,
  Policy,
  Inventory,
} from "../core/streak-logic.ts";
import { Jetstream } from "@skyware/jetstream";
import WebSocket from "ws";
import { PdsFetcher } from "../core/pds-fetcher.ts";
import { LabelSigner } from "../core/signer.ts";
import { LabelerSubscriptionServer } from "./server.ts";

export class LabelerService {
  private db: StreakDb;
  private jetstream: Jetstream;
  private fetcher: PdsFetcher;
  private signer: LabelSigner;
  private subServer: LabelerSubscriptionServer | null = null;

  constructor(db: StreakDb, privateKeyHex?: string) {
    this.db = db;
    this.fetcher = new PdsFetcher();
    this.signer = new LabelSigner(privateKeyHex);
    this.jetstream = new Jetstream({
      ws: WebSocket as any,
      wantedCollections: [
        "app.starrysky.streak.checkin",
        "app.starrysky.streak.inventory",
      ],
    });

    this.init();
  }

  public async start() {
    await this.signer.init();
    console.log("🔭 Starrysky Labeler Service starting...");
    this.jetstream.start();
  }

  public setSubscriptionServer(server: LabelerSubscriptionServer) {
    this.subServer = server;
  }

  private init() {
    this.jetstream.onCreate("app.starrysky.streak.inventory", async (event) => {
      const { did, commit } = event;
      const { record, uri, cid } = commit as any;
      const inv = record as unknown as Inventory;
      console.log(
        `[Labeler] Indexing inventory from ${did} for ${inv.subject}`,
      );
      this.db.upsertRecord(
        uri,
        cid,
        did,
        "app.starrysky.streak.inventory",
        uri.split("/").pop()!,
        inv,
      );
    });

    this.jetstream.onCreate("app.starrysky.streak.checkin", async (event) => {
      const { did, commit } = event;
      const { record, uri, cid } = commit as any;
      const checkin = record as unknown as Checkin;

      console.log(
        `[Labeler] Processing check-in from ${did} for ${checkin.subject}`,
      );

      try {
        // 1. Fetch policy (catch up if missing)
        let policy = this.db.getPolicy(checkin.policy);
        if (!policy) {
          console.log(
            `[Labeler] Policy ${checkin.policy} missing. Fetching...`,
          );
          const res = await this.fetcher.fetchRecord(checkin.policy);
          if (res) {
            const parts = checkin.policy.match(
              /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/,
            );
            if (parts) {
              this.db.upsertRecord(
                checkin.policy,
                res.cid,
                parts[1],
                parts[2],
                parts[3],
                res.record,
              );
              policy = res.record as Policy;
            }
          }
        }

        if (!policy) {
          console.warn(`[Labeler] Policy not found: ${checkin.policy}`);
          return;
        }

        // 2. Catch up history if prev is missing
        if (checkin.prev) {
          await this.catchupHistory(
            did,
            checkin.prev,
            "app.starrysky.streak.checkin",
          );
        }

        // 3. Fetch history
        const history = this.db.getCheckins(did, checkin.subject);
        const inventories = this.db.getInventories(did, checkin.subject);

        // 4. Validate
        const fullSequence = [...history];
        if (!fullSequence.some((c) => c.createdAt === checkin.createdAt)) {
          fullSequence.push(checkin);
        }

        const isValid = validateCheckinSequence(
          fullSequence,
          policy,
          inventories,
        );

        if (isValid) {
          console.log(
            `✅ [Labeler] Valid streak for ${did}. Generating signed label...`,
          );

          const label = {
            src: this.signer.did,
            uri: uri,
            cid: cid,
            val: "verifiedstreak",
            neg: false,
            cts: new Date().toISOString(),
          };

          const sig = await this.signer.signLabel(label);

          this.db.saveLabel(
            uri,
            cid,
            did,
            label.val,
            label.neg,
            label.cts,
            sig,
          );

          if (this.subServer) {
            this.subServer.broadcastLabel({
              ...label,
              sig: sig?.toString("base64"),
            });
          }
        }
      } catch (err: any) {
        console.error(
          `❌ [Labeler] Validation failed for ${did}: ${err.message}`,
        );
      }
    });
  }

  private async catchupHistory(
    did: string,
    prevCid: string,
    collection: string,
  ) {
    const existing = this.db.getRecordByCid(prevCid);
    if (existing) return;

    console.log(
      `[Labeler] Record with CID ${prevCid} in ${collection} missing. Catching up...`,
    );

    // Fetch from PDS
    const res = await this.fetcher.fetchRecordByCid(did, collection, prevCid);
    if (res) {
      const parts = res.uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
      if (parts) {
        this.db.upsertRecord(
          res.uri,
          prevCid,
          did,
          parts[2],
          parts[3],
          res.record,
        );

        // Recurse for check-ins
        if (collection === "app.starrysky.streak.checkin" && res.record.prev) {
          await this.catchupHistory(did, res.record.prev, collection);
        }
        // Also catch up inventory linked to this check-in if possible
        if (
          collection === "app.starrysky.streak.checkin" &&
          res.record.inventoryRef
        ) {
          await this.catchupHistory(
            did,
            res.record.inventoryRef,
            "app.starrysky.streak.inventory",
          );
        }
      }
    }
  }
}
