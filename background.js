// I Block Ad - Background Service Worker
// Handles stats tracking, enable/disable toggling, and per-site whitelist

const DEFAULT_SETTINGS = {
  enabled: true,
  blockAds: true,
  blockTrackers: true,
  totalBlocked: 0,
  whitelist: [],
};

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(null);
  if (!existing.initialized) {
    await chrome.storage.local.set({ ...DEFAULT_SETTINGS, initialized: true });
  }
  updateIcon();
});

// Track blocked requests via declarativeNetRequest feedback
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(
  async (info) => {
    if (info.request.action?.type === "block") {
      const data = await chrome.storage.local.get(["totalBlocked"]);
      await chrome.storage.local.set({
        totalBlocked: (data.totalBlocked || 0) + 1,
      });
      // Update badge
      updateBadge();
    }
  }
);

// Per-tab blocked count
const tabBlockCounts = {};

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    tabBlockCounts[details.tabId] = tabBlockCounts[details.tabId] || 0;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabBlockCounts[tabId];
});

async function updateBadge() {
  const data = await chrome.storage.local.get(["enabled", "totalBlocked"]);
  if (!data.enabled) {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#888888" });
    return;
  }
  const count = data.totalBlocked || 0;
  let text = "";
  if (count >= 1000000) text = (count / 1000000).toFixed(1) + "M";
  else if (count >= 1000) text = (count / 1000).toFixed(1) + "K";
  else text = count.toString();
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#00c853" });
}

async function updateIcon() {
  const data = await chrome.storage.local.get(["enabled"]);
  const iconPath = data.enabled !== false
    ? { 16: "icons/icon16.png", 48: "icons/icon48.png", 128: "icons/icon128.png" }
    : { 16: "icons/icon16_off.png", 48: "icons/icon48_off.png", 128: "icons/icon128_off.png" };
  // Use the same icon regardless of state (simplified)
  updateBadge();
}

// Message handler for popup communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATS") {
    chrome.storage.local.get(null).then((data) => {
      sendResponse({
        enabled: data.enabled !== false,
        totalBlocked: data.totalBlocked || 0,
        blockAds: data.blockAds !== false,
        blockTrackers: data.blockTrackers !== false,
        whitelist: data.whitelist || [],
      });
    });
    return true;
  }

  if (message.type === "TOGGLE_ENABLED") {
    chrome.storage.local.get(["enabled"]).then(async (data) => {
      const newEnabled = !data.enabled;
      await chrome.storage.local.set({ enabled: newEnabled });

      if (newEnabled) {
        // Re-enable rules
        chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: ["ad_rules"],
        });
      } else {
        // Disable rules
        chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: ["ad_rules"],
        });
      }
      updateBadge();
      sendResponse({ enabled: newEnabled });
    });
    return true;
  }

  if (message.type === "ADD_TO_WHITELIST") {
    chrome.storage.local.get(["whitelist"]).then(async (data) => {
      const whitelist = data.whitelist || [];
      if (!whitelist.includes(message.domain)) {
        whitelist.push(message.domain);
        await chrome.storage.local.set({ whitelist });
      }
      sendResponse({ whitelist });
    });
    return true;
  }

  if (message.type === "REMOVE_FROM_WHITELIST") {
    chrome.storage.local.get(["whitelist"]).then(async (data) => {
      const whitelist = (data.whitelist || []).filter(
        (d) => d !== message.domain
      );
      await chrome.storage.local.set({ whitelist });
      sendResponse({ whitelist });
    });
    return true;
  }

  if (message.type === "RESET_STATS") {
    chrome.storage.local.set({ totalBlocked: 0 }).then(() => {
      updateBadge();
      sendResponse({ success: true });
    });
    return true;
  }
});

// Initialize badge on startup
chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});
