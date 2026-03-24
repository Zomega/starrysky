import { StreakDb } from "../core/db.ts";
import { LabelerService } from "./service.ts";
import { LabelerSubscriptionServer } from "./server.ts";
import { StreakServer } from "../appview/server.ts";
import process from "node:process";

if (process.loadEnvFile) process.loadEnvFile();

const dbPath = process.env.DB_PATH || "streaks.db";
const port = parseInt(process.env.PORT || "3000");

const db = new StreakDb(dbPath);
const labeler = new LabelerService(db, process.env.LABELER_KEY);

// Even a standalone labeler needs a server to host com.atproto.label.subscribeLabels
const server = new StreakServer(db, true);
const httpServer = server.listen(port);
const subServer = new LabelerSubscriptionServer(httpServer);
labeler.setSubscriptionServer(subServer);

labeler.start();

console.log("🛡️ Standalone Labeler is running (No App View endpoints)");
