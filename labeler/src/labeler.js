import { BskyAgent } from "@atproto/api";
import { Jetstream } from "@skyware/jetstream";
import WebSocket from "ws";
import process from "node:process";

if (process.loadEnvFile) process.loadEnvFile();

const agent = new BskyAgent({ service: "https://bsky.social" });
await agent.login({
  identifier: process.env.BSKY_HANDLE,
  password: process.env.BSKY_PASSWORD,
});

const jetstream = new Jetstream({
  ws: WebSocket,
  wantedCollections: ["app.starrysky.streak"],
});

jetstream.onCreate("app.starrysky.streak", async (event) => {
  // Use event.did for the user's DID
  const did = event.did;
  const record = event.commit.record;

  const today = new Date().toISOString().split("T")[0];
  const recordDate = record.createdAt.split("T")[0];

  if (recordDate === today) {
    console.log(`✅ Valid streak: ${did}. Issuing label...`);

    try {
      const label = {
        src: agent.did,
        uri: event.commit.uri, // This is the AT-URI of the post
        cid: event.commit.cid,
        val: "verifiedstreak",
        cts: new Date().toISOString(),
      };

      console.log("🚀 Label ready to emit:", JSON.stringify(label, null, 2));

      // We will implement the actual WebSocket emit once
      // the Lexicon and "catching" logic are 100% solid.
    } catch (err) {
      console.error("❌ Failed to process label:", err.message);
    }
  }
});

jetstream.start();
console.log("🔭 Starrysky Bot is scanning the firehose...");
