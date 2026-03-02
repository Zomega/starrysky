import { BskyAgent } from "@atproto/api";
import passwordPrompt from "password-prompt";
import process from "node:process";

// This line loads your .env file natively in Node 20.12+
// If you are on an older version, use: import 'dotenv/config'
if (process.loadEnvFile) process.loadEnvFile();

async function registerLabeler() {
  const handle = process.env.BSKY_HANDLE || "starrysky.app";

  // Use password from .env, or prompt if missing
  let password = process.env.BSKY_PASSWORD;
  if (!password) {
    password = await passwordPrompt("Enter your Bluesky App Password: ");
  }

  const agent = new BskyAgent({ service: "https://bsky.social" });

  try {
    await agent.login({ identifier: handle, password });
    console.log("🔑 Logged in successfully.");

    await agent.com.atproto.repo.putRecord({
      repo: agent.did,
      collection: "app.bsky.labeler.service",
      rkey: "self",
      record: {
        $type: "app.bsky.labeler.service",
        createdAt: new Date().toISOString(),
        policies: {
          labelValues: ["verifiedstreak"],
          labelValueDefinitions: [
            {
              identifier: "verifiedstreak",
              severity: "informational",
              blurs: "none",
              defaultSetting: "contentView",
              adultOnly: false,
              locales: [
                {
                  lang: "en",
                  name: "Verified Streak",
                  description:
                    "Completed a Starrysky goal at the reported time!",
                },
              ],
            },
          ],
        },
      },
    });

    console.log("You are now a starrysky Labeler!");
  } catch (err) {
    console.error("❌ Registration failed:", err.message);
  }
}

registerLabeler();
