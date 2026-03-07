// popup.js
// Chrome extension popup script — Ad/Tracker Blocker

/**
 * Main entry point for the popup UI logic
 */
document.addEventListener('DOMContentLoaded', async () => {
  const elements = getDOMElements();
  if (!elements) return; // early exit if critical elements missing

  const currentDomain = await getCurrentTabDomain();
  elements.currentDomain.textContent = currentDomain || '—';

  // Initial state load
  const stats = await sendMessageAsync({ type: 'GET_STATS' });
  if (stats) {
    renderUI(stats, currentDomain, elements);
  }

  // Event listeners
  registerEventListeners(elements, currentDomain);
});

/**
 * Cache DOM queries — single source of truth for elements
 */
function getDOMElements() {
  const ids = [
    'currentDomain',
    'blockedCount',
    'ringProgress',
    'mainToggle',
    'toggleLabel',
    'statusDot',
    'statusText',
    'blockAds',
    'blockTrackers',
    'btnWhitelist',
    'btnBlock',
    'btnReset',
  ];

  const elements = {};
  for (const id of ids) {
    elements[id] = document.getElementById(id);
    if (!elements[id] && id !== 'btnBlock') { // btnBlock is optional
      console.warn(`Element #${id} not found`);
    }
  }

  return Object.values(elements).every(el => el || el === undefined)
    ? elements
    : null;
}

/**
 * Get hostname of active tab (without www.)
 */
async function getCurrentTabDomain() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return '';
    const url = new URL(tab.url);
    return url.hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

/**
 * Render all UI parts based on current stats
 */
function renderUI(stats, domain, els) {
  const enabled = !!stats.enabled;

  // Main counter + ring animation
  animateCounter(els.blockedCount, stats.totalBlocked || 0);
  updateProgressRing(els.ringProgress, stats.totalBlocked || 0);

  // Main toggle + body state
  els.mainToggle.checked = enabled;
  els.toggleLabel.textContent = enabled ? 'ON' : 'OFF';
  document.body.classList.toggle('disabled', !enabled);

  // Status indicator
  els.statusDot.className = `status-dot${enabled ? '' : ' off'}`;
  els.statusText.innerHTML = enabled
    ? '<strong>Protection active</strong> — ads & trackers blocked'
    : '<strong>Protection paused</strong> — click toggle to re-enable';

  // Sub-toggles (stored preferences)
  els.blockAds.checked = !!stats.blockAds;
  els.blockTrackers.checked = !!stats.blockTrackers;

  // Whitelist button
  const isWhitelisted = (stats.whitelist || []).includes(domain);
  els.btnWhitelist.textContent = isWhitelisted ? '✗ Remove Whitelist' : '✓ Allow Site';
  els.btnWhitelist.className = isWhitelisted ? 'btn btn-block' : 'btn btn-allow';
}

/**
 * Animate number counter with ease-out cubic
 */
function animateCounter(element, target) {
  if (!element) return;

  const duration = 900;
  const startTime = performance.now();
  const startValue = 0;

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
    const value = Math.round(startValue + (target - startValue) * eased);

    element.textContent = formatCompactNumber(value);

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = formatCompactNumber(target);
    }
  }

  requestAnimationFrame(step);
}

function formatCompactNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >=   1_000) return (n /   1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

/**
 * Update SVG progress ring
 */
function updateProgressRing(ringElement, count) {
  if (!ringElement) return;

  const MAX_DISPLAY = 10_000;
  const circumference = 301.6; // ≈ 96 × π (your SVG circle r=48)
  const progress = Math.min(count / MAX_DISPLAY, 1);
  const offset = circumference * (1 - progress);

  ringElement.style.strokeDashoffset = offset;
}

/**
 * Central place for all event listeners
 */
function registerEventListeners(els, currentDomain) {
  // Main toggle
  els.mainToggle?.addEventListener('change', async () => {
    const response = await sendMessageAsync({ type: 'TOGGLE_ENABLED' });
    const enabled = response?.enabled ?? true;

    els.toggleLabel.textContent = enabled ? 'ON' : 'OFF';
    document.body.classList.toggle('disabled', !enabled);

    els.statusDot.className = `status-dot${enabled ? '' : ' off'}`;
    els.statusText.innerHTML = enabled
      ? '<strong>Protection active</strong> — ads & trackers blocked'
      : '<strong>Protection paused</strong> — click toggle to re-enable';
  });

  // Whitelist / remove from whitelist
  els.btnWhitelist?.addEventListener('click', async () => {
    if (!currentDomain) return;

    const stats = await sendMessageAsync({ type: 'GET_STATS' });
    const isWhitelisted = (stats?.whitelist || []).includes(currentDomain);
    const messageType = isWhitelisted ? 'REMOVE_FROM_WHITELIST' : 'ADD_TO_WHITELIST';

    await sendMessageAsync({ type: messageType, domain: currentDomain });

    const newStats = await sendMessageAsync({ type: 'GET_STATS' });
    if (newStats) renderUI(newStats, currentDomain, els);
  });

  // Block site button (feedback only — actual blocking logic probably elsewhere)
  els.btnBlock?.addEventListener('click', () => {
    if (!currentDomain) return;

    els.btnBlock.textContent = 'Blocked!';
    els.btnBlock.style.opacity = '0.6';

    setTimeout(() => {
      els.btnBlock.textContent = '✗ Block Site';
      els.btnBlock.style.opacity = '';
    }, 1600);
  });

  // Reset stats
  els.btnReset?.addEventListener('click', async () => {
    await sendMessageAsync({ type: 'RESET_STATS' });
    animateCounter(els.blockedCount, 0);
    updateProgressRing(els.ringProgress, 0);
  });

  // Sub-toggles → local storage (persistent user preferences)
  els.blockAds?.addEventListener('change', e => {
    chrome.storage.local.set({ blockAds: e.target.checked });
  });

  els.blockTrackers?.addEventListener('change', e => {
    chrome.storage.local.set({ blockTrackers: e.target.checked });
  });
}

/**
 * Promise wrapper for chrome.runtime.sendMessage
 */
function sendMessageAsync(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}
