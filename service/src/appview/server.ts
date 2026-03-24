import express from "express";
import cors from "cors";
import { StreakDb } from "../core/db.ts";
import { getGridDataForRange } from "../core/streak-logic.ts";
import { Server } from "http";

export class StreakServer {
  private app: express.Application;
  private db: StreakDb;
  private server: Server | null = null;

  constructor(
    db: StreakDb,
    private disableAppView: boolean = false,
  ) {
    this.db = db;
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    this.init();
  }

  private init() {
    this.app.get("/xrpc/com.atproto.label.queryLabels", (req, res) => {
      const uriPatterns = req.query.uriPatterns as string[];
      // Simplified queryLabels: returns all labels for a user if uriPatterns contains a DID
      const did = uriPatterns?.find((p) => p.startsWith("did:")) || "";
      const labels = this.db.getLabels(did);
      res.json({ labels });
    });

    if (this.disableAppView) return;

    this.app.get("/xrpc/app.starrysky.streak.getProfileStreaks", (req, res) => {
      const actor = req.query.actor as string;
      if (!actor) return res.status(400).send("Actor is required");

      const subjects = this.db.getSubjects(actor);
      const summaries = subjects.map((subject) => {
        const checkins = this.db.getCheckins(actor, subject);
        const latestCheckin = checkins[checkins.length - 1];
        const inventories = this.db.getInventories(actor, subject);
        const latestInventory = inventories[inventories.length - 1];

        return {
          subject,
          streakSequence: latestCheckin ? latestCheckin.streakSequence : 0,
          lastCheckinDate: latestCheckin ? latestCheckin.streakDate : null,
          balance: latestInventory ? latestInventory.balance : 0,
        };
      });

      res.json({ streaks: summaries });
    });

    this.app.get("/xrpc/app.starrysky.streak.getStreakDetail", (req, res) => {
      const actor = req.query.actor as string;
      const subject = req.query.subject as string;
      const policyUri = req.query.policy as string;

      if (!actor || !subject || !policyUri) {
        return res.status(400).send("Actor, subject, and policy are required");
      }

      const policy = this.db.getPolicy(policyUri);
      if (!policy) return res.status(404).send("Policy not found");

      const checkins = this.db.getCheckins(actor, subject);
      const inventories = this.db.getInventories(actor, subject);
      const latestInventory = inventories[inventories.length - 1];

      // Example grid data for the last 30 days
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      const gridData = getGridDataForRange(
        checkins,
        subject,
        start.toISOString().split("T")[0],
        end.toISOString().split("T")[0],
      );

      res.json({
        policy,
        checkins,
        inventory: latestInventory || { balance: 0 },
        gridData,
      });
    });

    this.app.get("/xrpc/app.starrysky.streak.getStreakStatus", (req, res) => {
      const actor = req.query.actor as string;
      const subject = req.query.subject as string;

      if (!actor || !subject) {
        return res.status(400).send("Actor and subject are required");
      }

      const checkins = this.db.getCheckins(actor, subject);
      const latestCheckin = checkins[checkins.length - 1];
      const inventories = this.db.getInventories(actor, subject);
      const latestInventory = inventories[inventories.length - 1];

      res.json({
        subject,
        streakSequence: latestCheckin ? latestCheckin.streakSequence : 0,
        balance: latestInventory ? latestInventory.balance : 0,
        lastCheckinDate: latestCheckin ? latestCheckin.streakDate : null,
      });
    });
  }

  public listen(port: number = 3000): Server {
    this.server = this.app.listen(port, () => {
      console.log(`🚀 Streak App View listening on http://localhost:${port}`);
    });
    return this.server;
  }
}
