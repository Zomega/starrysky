import { BrowserOAuthClient } from "https://esm.sh/@atproto/oauth-client-browser@0.3.0?bundle";
import { Agent } from "https://esm.sh/@atproto/api@0.18.20?bundle";

const METADATA_URL =
  "https://starrysky.app/client-metadata.json";

// We keep these global to access them for debugging
let client;
let agent;
let oauthSession;

async function init() {
  const statusEl = document.getElementById("status");
  const loginBtn = document.getElementById("login-btn");
  
  console.log("App initializing...");
  statusEl.innerText = "Connecting to Bluesky...";

  try {
    const response = await fetch(METADATA_URL);
    if (!response.ok) throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    const metadata = await response.json();

    client = new BrowserOAuthClient({
      handleResolver: "https://bsky.social",
      clientMetadata: metadata,
    });

    window.client = client;
    console.log("🛠️ window.client is ready");

    // The SDK should handle the redirect return automatically.
    // We don't need to pass the URI here, it should be retrieved from storage.
    const result = await client.init();

    if (result?.session) {
      setupGameUI(result.session);
    } else {
      console.log("No session found, waiting for user login.");
      statusEl.innerText = "Please log in to continue.";
      if (loginBtn) loginBtn.disabled = false;
    }
  } catch (err) {
    console.error("Initialization failed:", err);
    statusEl.innerText = "Connection Error: " + err.message;
    statusEl.style.color = "var(--red-500)";
  }
}

async function setupGameUI(session) {
  oauthSession = session;
  window.oauthSession = oauthSession;
  console.log("🛠️ window.oauthSession is ready");

  console.log("Initializing Agent with valid session...");

  agent = new Agent(oauthSession);
  window.agent = agent;
  console.log("🛠️ window.agent is ready");

  // Toggle UI
  document.getElementById("login-section").style.display = "none";
  document.getElementById("game-section").style.display = "block";
  document.getElementById("user-info").innerText =
    "Authenticated. Loading profile...";

  await fetchMyProfile(oauthSession.sub);
  await readCheckin();
}

async function fetchMyProfile(did) {
  try {
    console.log("Fetching profile for:", did);

    const response = await agent.getProfile({ actor: did });
    const profile = response.data;

    console.log("Profile fetched:", profile);

    const avatarUrl =
      profile.avatar ||
      "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

    const name = profile.displayName || profile.handle;

    document.getElementById("user-info").innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 1rem;">
                <img src="${avatarUrl}" style="width:50px; height:50px; border-radius:50%; border: 2px solid var(--accent); object-fit: cover;">
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
  if (!client) return alert("Client not initialized. Please wait or refresh.");
  
  const handle = document.getElementById("handle").value.trim();
  if (!handle) return alert("Enter your handle");

  try {
    // Ensure we use the current origin as the redirect URI (with trailing slash)
    const redirectUri = window.location.origin + "/";
    console.log("Signing in with redirect:", redirectUri);

    const { url } = await client.signIn(handle, {
      scope: "atproto transition:generic",
      ui_locales: "en",
      redirect_uri: redirectUri,
    });
    window.location.href = url;
  } catch (err) {
    console.error("Login failed:", err);
    alert("Login failed: " + err.message);
  }
}

async function saveCheckin() {
  if (!agent || !oauthSession) return;
  
  try {
    const did = oauthSession.sub;
    const now = new Date().toISOString();

    console.log("Saving check-in data...");

    await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: "app.starrysky.streak.checkin",
      rkey: "daily-checkin", 
      record: {
        $type: "app.starrysky.streak.checkin",
        service: "app.starrysky",
        policy: "at://did:plc:placeholder/app.starrysky.streak.policy/main",
        subject: "Daily Streak",
        sequence: 1,
        createdAt: now,
        note: "Checked in via Starrysky!",
      },
    });

    alert("Check-in saved successfully!");
    await readCheckin();
  } catch (err) {
    console.error("Save failed:", err);
    alert("Save failed: " + err.message);
  }
}

async function readCheckin() {
  if (!agent || !oauthSession) return;

  try {
    const did = oauthSession.sub;

    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: "app.starrysky.streak.checkin",
      rkey: "daily-checkin",
    });

    const val = response.data.value;
    document.getElementById("status").innerText =
      `Last check-in: ${new Date(val.createdAt).toLocaleString()}`;
  } catch (err) {
    if (err.message.includes("Could not find record")) {
      document.getElementById("status").innerText = "No check-in found for today.";
    } else {
      console.error("Read failed:", err);
    }
  }
}

window.saveCheckin = saveCheckin;
window.readCheckin = readCheckin;

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.disabled = true; // Disable initially
    loginBtn.addEventListener("click", login);
  }
  
  const saveBtn = document.getElementById("save-checkin-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveCheckin);
  }
  
  init();
});
