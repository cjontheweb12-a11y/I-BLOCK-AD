# I Block Ad

A powerful, privacy-focused ad blocker extension for Chrome and Firefox.

## Features
- Blocks 50+ major ad networks (Google Ads, DoubleClick, Taboola, Outbrain, etc.)
- Blocks tracking scripts (Google Analytics, Facebook Pixel, Hotjar, Mixpanel, etc.)
- Cosmetic filtering — hides ad containers with CSS injection
- Per-site whitelist support
- Total blocked requests counter with animated UI
- Enable/disable with one click
- Works on Chrome (MV3) and Firefox (MV3 via gecko settings)

## Installation

### Chrome / Edge / Brave
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `adblocker/` folder
5. The I Block Ad icon appears in your toolbar ✓

### Firefox
1. Open Firefox and go to `about:debugging`
2. Click **"This Firefox"** on the left
3. Click **"Load Temporary Add-on..."**
4. Navigate to the `adblocker/` folder and select `manifest.json`
5. The extension loads temporarily (permanent install requires signing via AMO)

**For permanent Firefox install:**
- Package as a `.zip`, rename to `.xpi`, submit to [addons.mozilla.org](https://addons.mozilla.org) for signing

## File Structure
```
adblocker/
├── manifest.json        # Extension manifest (MV3, Chrome + Firefox)
├── background.js        # Service worker: toggles, stats tracking
├── content.js           # Cosmetic filter: hides ad DOM elements
├── popup.html           # Extension popup UI
├── popup.js             # Popup logic
├── rules/
│   └── ad_rules.json    # 50 declarativeNetRequest blocking rules
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Adding More Block Rules
Edit `rules/ad_rules.json` to add more domains. Each rule follows this format:
```json
{
  "id": 51,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "||example-ad-network.com^",
    "resourceTypes": ["script","image","xmlhttprequest","sub_frame","other"]
  }
}
```
Note: Chrome MV3 allows up to 5,000 static rules per ruleset.

## Privacy
I Block Ad does not collect any data. All blocking happens locally on your device.
