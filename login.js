import { BrowserOAuthClient } from "https://esm.sh/@atproto/oauth-client-browser@0.3.0?bundle";
import { Agent } from "https://esm.sh/@atproto/api@0.18.20?bundle";

const METADATA_URL =
  "https://zomega.github.io/atproto-sandbox/client-metadata.json";

// We keep these global to access them for debugging
let client;
let agent;

async function init() {
  const statusEl = document.getElementById("status");
  console.log("App initializing...");

  try {
    const response = await fetch(METADATA_URL);
    const metadata = await response.json();

    client = new BrowserOAuthClient({
      handleResolver: "https://bsky.social",
      clientMetadata: metadata,
    });

    window.client = client;
    console.log("🛠️ window.client is ready");

    // This handles the redirect return automatically
    const result = await client.init();

    if (result?.session) {
      setupGameUI(result.session);
    } else {
      console.log("No session found, waiting for user login.");
      statusEl.innerText = "Please log in to continue.";
    }
  } catch (err) {
    console.error("Initialization failed:", err);
    statusEl.innerText = "Error: " + err.message;
  }
}

async function setupGameUI(oauthSession) {
  window.oauthSession = oauthSession;
  console.log("🛠️ window.oauthSession is ready");

  console.log("Initializing Agent with valid session...");

  // 1. The Correct Way to Init:
  // The Agent constructor in 0.18+ is smart enough to take the OAuth session directly.
  agent = new Agent(oauthSession);

  window.agent = agent;
  console.log("🛠️ window.agent is ready");

  // Toggle UI
  document.getElementById("login-section").style.display = "none";
  document.getElementById("game-section").style.display = "block";
  document.getElementById("user-info").innerText =
    "Authenticated. Loading profile...";

  // 2. The Fix:
  // The agent doesn't have 'agent.session', so we pass the DID from the oauthSession.
  await fetchMyProfile(oauthSession.sub);
}

async function fetchMyProfile(did) {
  try {
    console.log("Fetching profile for:", did);

    const response = await agent.getProfile({ actor: did });
    const profile = response.data;

    console.log("Profile fetched:", profile);

    // FIX: Handle missing avatar and display name
    // If profile.avatar is undefined, use a generic placeholder
    const avatarUrl =
      profile.avatar ||
      "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

    // Some users might not have a display name set either
    const name = profile.displayName || profile.handle;

    document.getElementById("user-info").innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <img src="${avatarUrl}" style="width:50px; height:50px; border-radius:50%; border: 2px solid var(--accent-color); object-fit: cover;">
                <div style="text-align: left;">
                    <div style="font-weight: bold;">${name}</div>
                    <div style="font-size: 0.8em; opacity: 0.8;">@${profile.handle}</div>
                </div>
            </div>
        `;
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    document.getElementById("user-info").innerText = "Error: " + err.message;
  }
}

async function login() {
  const handle = document.getElementById("handle").value.trim();
  if (!handle) return alert("Enter your handle");

  try {
    const { url } = await client.signIn(handle, {
      // TODO: Load this from the metadata.
      scope: "atproto transition:generic",
      ui_locales: "en",
    });
    window.location.href = url;
  } catch (err) {
    console.error("Login failed:", err);
    alert("Login failed: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-btn").addEventListener("click", login);
  init();
});

// 1. Write or Update a specific record
async function saveTestData() {
  try {
    const did = oauthSession.sub;
    const now = new Date().toISOString();

    console.log("Saving test data...");

    // 'putRecord' is the Upsert command
    await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: "com.zomega.test",
      rkey: "singleton", // Using a fixed key prevents multiple entries
      record: {
        $type: "com.zomega.test",
        message: "Hello from ATProto Wordle Sandbox!",
        updatedAt: now,
        developer: "Will Oursler",
      },
    });

    alert("Record saved/updated successfully!");
    await readTestData(); // Refresh the view
  } catch (err) {
    console.error("Save failed:", err);
  }
}

// 2. Read that specific record back
async function readTestData() {
  try {
    const did = oauthSession.sub;

    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: "com.zomega.test",
      rkey: "singleton",
    });

    console.log("Record retrieved:", response.data.value);

    // Update the UI with the result
    const val = response.data.value;
    document.getElementById("status").innerText =
      `Last updated: ${new Date(val.updatedAt).toLocaleTimeString()}`;
  } catch (err) {
    if (err.message.includes("Could not find record")) {
      console.log("No record found yet.");
    } else {
      console.error("Read failed:", err);
    }
  }
}

// Expose the test functions for console access during development.
window.saveTestData = saveTestData;
window.readTestData = readTestData;
