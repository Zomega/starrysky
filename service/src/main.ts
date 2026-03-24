import { StreakDb } from "./core/db.ts";
import { StreakIndexer } from "./appview/indexer.ts";
import { StreakServer } from "./appview/server.ts";
import { LabelerService } from "./labeler/service.ts";
import { LabelerSubscriptionServer } from "./labeler/server.ts";
import process from "node:process";

if (process.loadEnvFile) process.loadEnvFile();

const dbPath = process.env.DB_PATH || "streaks.db";
const port = parseInt(process.env.PORT || "3000");

const db = new StreakDb(dbPath);
const indexer = new StreakIndexer(db);
const labeler = new LabelerService(db, process.env.LABELER_KEY);
const server = new StreakServer(db);

const httpServer = server.listen(port);
const subServer = new LabelerSubscriptionServer(httpServer);
labeler.setSubscriptionServer(subServer);

indexer.start();
labeler.start();

console.log("🚀 Starrysky Combined Service is running (App View + Labeler)");
