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
  const { did, record } = event.commit;
  const today = new Date().toISOString().split("T")[0];
  const recordDate = record.createdAt.split("T")[0];

  if (recordDate === today) {
    console.log(`✅ Valid streak: ${did}. Issuing label...`);

    try {
      // Apply label to the specific record URI
      await agent.com.atproto.label.queryLabels({
        // TODO: Implement. There's a lot to do here.
        // In a real production bot, you'd use a dedicated
        // labeling endpoint, but for small volume,
        // we can push a 'Self-Label' or use the moderation API.
      });

      // For now, let's log the success!
      console.log(
        `Label 'verifiedstreak' would be applied to ${event.commit.uri}`,
      );
    } catch (err) {
      console.error("Failed to label:", err.message);
    }
  }
});

jetstream.start();
console.log("🔭 Starrysky Bot is scanning the firehose...");
