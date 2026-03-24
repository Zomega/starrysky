import { BskyAgent } from "@atproto/api";
import process from "node:process";

if (process.loadEnvFile) process.loadEnvFile();

async function sendTestStreak() {
  const agent = new BskyAgent({ service: "https://bsky.social" });

  // Use your PERSONAL account credentials here (in .env)
  // or hardcode them just for this quick test.
  await agent.login({
    identifier: process.env.PERSONAL_HANDLE,
    password: process.env.PERSONAL_PASSWORD,
  });

  console.log("🚀 Logged in. Pushing test streak...");

  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.did,
    collection: "app.starrysky.streak",
    record: {
      $type: "app.starrysky.streak",
      subject: "Testing the Bot",
      sequence: 1,
      createdAt: new Date().toISOString(), // This will match 'today' for the bot
    },
  });

  console.log("✅ Record created!");
  console.log("URI:", res.uri || res.data?.uri);
}

sendTestStreak().catch(console.error);
