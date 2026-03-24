import { StreakDb } from "../core/db.ts";
import { StreakIndexer } from "./indexer.ts";
import { StreakServer } from "./server.ts";
import process from "node:process";

if (process.loadEnvFile) process.loadEnvFile();

const dbPath = process.env.DB_PATH || "streaks.db";
const port = parseInt(process.env.PORT || "3000");

const db = new StreakDb(dbPath);
const indexer = new StreakIndexer(db);
const server = new StreakServer(db);

server.listen(port);
indexer.start();

console.log("🏃 Standalone App View is running (No Labeler)");
