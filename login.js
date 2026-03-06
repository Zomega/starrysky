import { BrowserOAuthClient } from "https://esm.sh/@atproto/oauth-client-browser@0.3.0?bundle";
import { Agent } from "https://esm.sh/@atproto/api@0.18.20?bundle";

const METADATA_URL = "https://starrysky.app/client-metadata.json";

// We keep these global to access them for debugging
let client;
let agent;
let oauthSession;

async function init() {
  const statusEl = document.getElementById("status");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // Security/Config Check: ATProto OAuth requires 127.0.0.1 for local dev, not localhost.
  if (window.location.hostname === "localhost") {
    console.warn(
      "Redirecting to 127.0.0.1 to comply with OAuth requirements...",
    );
    window.location.hostname = "127.0.0.1";
    return;
  }

  console.log("App initializing...");
  if (statusEl) statusEl.innerText = "Connecting to Bluesky...";

  try {
    const response = await fetch(METADATA_URL);
    if (!response.ok)
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    const metadata = await response.json();

    client = new BrowserOAuthClient({
      handleResolver: "https://bsky.social",
      clientMetadata: metadata,
    });

    window.client = client;
    console.log("🛠️ window.client is ready");

    // The SDK should handle the redirect return automatically.
    const result = await client.init();
    console.log("Client init result:", result);

    if (result?.session) {
      console.log("Session found in init result");
      await setupGameUI(result.session);
    } else {
      console.log("No session found, waiting for user login.");
      if (statusEl) statusEl.innerText = "Please log in to continue.";
      if (loginBtn) loginBtn.disabled = false;
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  } catch (err) {
    console.error("Initialization failed:", err);
    if (statusEl) {
      statusEl.innerText = "Connection Error: " + err.message;
      statusEl.style.color = "var(--red-500)";
    }
  }
}

async function setupGameUI(session) {
  oauthSession = session;
  window.oauthSession = oauthSession;
  console.log("Setting up UI for session:", session.sub);

  // IMMEDIATELY show logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.style.display = "flex";
  }

  agent = new Agent(oauthSession);
  window.agent = agent;

  // Toggle other UI elements if they exist
  const loginSection = document.getElementById("login-section");
  if (loginSection) loginSection.style.display = "none";

  const gameSection = document.getElementById("game-section");
  if (gameSection) gameSection.style.display = "block";

  const userInfo = document.getElementById("user-info");
  if (userInfo) userInfo.innerText = "Authenticated. Loading profile...";

  await fetchMyProfile(oauthSession.sub);
  await readCheckin();
}

async function fetchMyProfile(did) {
  const userInfo = document.getElementById("user-info");
  if (!userInfo) return;

  try {
    const response = await agent.getProfile({ actor: did });
    const profile = response.data;

    const avatarUrl =
      profile.avatar ||
      "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

    const name = profile.displayName || profile.handle;

    userInfo.innerHTML = `
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
    userInfo.innerText = "Error: " + err.message;
  }
}

async function login() {
  if (!client) return alert("Client not initialized. Please wait or refresh.");

  const handleEl = document.getElementById("handle");
  if (!handleEl) return;
  const handle = handleEl.value.trim();
  if (!handle) return alert("Enter your handle");

  try {
    const redirectUri = window.location.origin + "/";
    console.log("signIn initiating with redirect_uri:", redirectUri);

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

async function logout() {
  console.log("Logging out...");
  if (oauthSession) {
    try {
      await oauthSession.signOut();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }
  // Redirect to home to clear state
  window.location.href = window.location.origin + "/";
}

async function saveCheckin() {
  if (!agent || !oauthSession) return;

  try {
    const did = oauthSession.sub;
    const now = new Date();
    const isoNow = now.toISOString();
    const dateStr = isoNow.split("T")[0]; // YYYY-MM-DD

    console.log(`Saving check-in for ${dateStr}...`);

    // In a real app, we would use the core logic to calculate the sequence
    // based on the previous record. For this mockup simulation, we'll just upsert.
    await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: "app.starrysky.streak.checkin",
      rkey: "daily-checkin",
      record: {
        $type: "app.starrysky.streak.checkin",
        originService: "app.starrysky",
        policy: "at://did:plc:placeholder/app.starrysky.streak.policy/main",
        subject: "Daily Streak",
        streakSequence: 1, // Placeholder
        streakDate: dateStr,
        checkinsInInterval: 1,
        freezeDates: [],
        createdAt: isoNow,
        note: "Checked in via Starrysky!",
      },
    });

    alert("Check-in saved successfully!");
    await readCheckin(); // Refresh the view
  } catch (err) {
    console.error("Save failed:", err);
    alert("Save failed: " + err.message);
  }
}

async function readCheckin() {
  if (!agent || !oauthSession) return;
  const statusEl = document.getElementById("status");
  if (!statusEl) return;

  try {
    const did = oauthSession.sub;
    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: "app.starrysky.streak.checkin",
      rkey: "daily-checkin",
    });

    const val = response.data.value;
    statusEl.innerText = `Last check-in (${val.streakDate}): ${new Date(val.createdAt).toLocaleString()}`;
  } catch (err) {
    if (err.message.includes("Could not find record")) {
      statusEl.innerText = "No check-in found for today.";
    } else {
      console.error("Read failed:", err);
    }
  }
}

window.saveCheckin = saveCheckin;
window.readCheckin = readCheckin;
window.logout = logout;

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", login);
  }

  const saveBtn = document.getElementById("save-checkin-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveCheckin);
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  init();
});
