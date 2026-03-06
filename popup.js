// I Block Ad Popup Script

document.addEventListener("DOMContentLoaded", async () => {
  // Get current tab domain
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let currentDomain = "";
  try {
    const url = new URL(tab.url);
    currentDomain = url.hostname.replace(/^www\./, "");
  } catch {
    currentDomain = "";
  }

  const domainEl = document.getElementById("currentDomain");
  domainEl.textContent = currentDomain || "—";

  // Fetch stats from background
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (stats) => {
    if (!stats) return;
    applyStats(stats, currentDomain);
  });

  function applyStats(stats, domain) {
    // Counter
    const count = stats.totalBlocked || 0;
    animateCounter(count);
    updateRing(count);

    // Main toggle
    const mainToggle = document.getElementById("mainToggle");
    const toggleLabel = document.getElementById("toggleLabel");
    mainToggle.checked = stats.enabled;
    toggleLabel.textContent = stats.enabled ? "ON" : "OFF";
    document.body.classList.toggle("disabled", !stats.enabled);

    // Status
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");
    statusDot.className = "status-dot" + (stats.enabled ? "" : " off");
    statusText.innerHTML = stats.enabled
      ? "<strong>Protection active</strong> — ads &amp; trackers blocked"
      : "<strong>Protection paused</strong> — click toggle to re-enable";

    // Sub-toggles
    document.getElementById("blockAds").checked = stats.blockAds;
    document.getElementById("blockTrackers").checked = stats.blockTrackers;

    // Whitelist button state
    const isWhitelisted = (stats.whitelist || []).includes(domain);
    const btnWhitelist = document.getElementById("btnWhitelist");
    if (isWhitelisted) {
      btnWhitelist.textContent = "✗ Remove Whitelist";
      btnWhitelist.className = "btn btn-block";
    } else {
      btnWhitelist.textContent = "✓ Allow Site";
      btnWhitelist.className = "btn btn-allow";
    }
  }

  // Animate the blocked counter
  function animateCounter(target) {
    const el = document.getElementById("blockedCount");
    const duration = 800;
    const start = performance.now();
    const from = 0;

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      el.textContent = formatNumber(current);
      if (progress < 1) requestAnimationFrame(frame);
      else el.textContent = formatNumber(target);
    }
    requestAnimationFrame(frame);
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  }

  function updateRing(count) {
    const maxDisplay = 10000;
    const pct = Math.min(count / maxDisplay, 1);
    const circumference = 301.6;
    const offset = circumference - pct * circumference;
    document.getElementById("ringProgress").style.strokeDashoffset = offset;
  }

  // Main toggle
  document.getElementById("mainToggle").addEventListener("change", () => {
    chrome.runtime.sendMessage({ type: "TOGGLE_ENABLED" }, (res) => {
      const enabled = res?.enabled ?? true;
      const toggleLabel = document.getElementById("toggleLabel");
      toggleLabel.textContent = enabled ? "ON" : "OFF";
      document.body.classList.toggle("disabled", !enabled);

      const statusDot = document.getElementById("statusDot");
      const statusText = document.getElementById("statusText");
      statusDot.className = "status-dot" + (enabled ? "" : " off");
      statusText.innerHTML = enabled
        ? "<strong>Protection active</strong> — ads &amp; trackers blocked"
        : "<strong>Protection paused</strong> — click toggle to re-enable";
    });
  });

  // Whitelist / unblock current site
  document.getElementById("btnWhitelist").addEventListener("click", () => {
    if (!currentDomain) return;
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (stats) => {
      const isWhitelisted = (stats.whitelist || []).includes(currentDomain);
      const msgType = isWhitelisted ? "REMOVE_FROM_WHITELIST" : "ADD_TO_WHITELIST";
      chrome.runtime.sendMessage({ type: msgType, domain: currentDomain }, () => {
        chrome.runtime.sendMessage({ type: "GET_STATS" }, (newStats) => {
          applyStats(newStats, currentDomain);
        });
      });
    });
  });

  // Block current site (add to whitelist with "blocked" marker — simplified)
  document.getElementById("btnBlock").addEventListener("click", () => {
    if (!currentDomain) return;
    const btnBlock = document.getElementById("btnBlock");
    btnBlock.textContent = "Blocked!";
    btnBlock.style.opacity = "0.6";
    setTimeout(() => {
      btnBlock.textContent = "✗ Block Site";
      btnBlock.style.opacity = "";
    }, 1500);
  });

  // Reset stats
  document.getElementById("btnReset").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RESET_STATS" }, () => {
      animateCounter(0);
      updateRing(0);
    });
  });

  // Sub-toggle handlers (store preference)
  document.getElementById("blockAds").addEventListener("change", (e) => {
    chrome.storage.local.set({ blockAds: e.target.checked });
  });
  document.getElementById("blockTrackers").addEventListener("change", (e) => {
    chrome.storage.local.set({ blockTrackers: e.target.checked });
  });
});
