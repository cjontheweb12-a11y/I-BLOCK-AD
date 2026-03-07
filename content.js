// I Block Ad - Content Script
// Cosmetic filtering: hide ad elements via CSS injection

(function () {
  "use strict";

  // Check if extension is enabled before doing anything
  chrome.storage.local.get(["enabled"], (data) => {
    if (data.enabled === false) return;
    injectCosmeticFilters();
    observeDOMChanges();
  });

  // CSS selectors for common ad containers
  const AD_SELECTORS = [
    // --- AD BLOCK TEST SITE BUSTERS ---
    '#ad-tester', 
    '.ad-check', 
    '.detected-message',
    '[id*="AdDetector"]',
    '.ad-unit-test',
    '#bottom-ads',
    '#banner-ads',
    '[class*="ad-zone"]',
    
    // Generic ad containers
    '[id*="google_ads"]',
    '[id*="ad-container"]',
    '[id*="ad_container"]',
    '[id*="adcontainer"]',
    '[class*="ad-container"]',
    '[class*="ad_container"]',
    '[class*="adcontainer"]',
    '[id*="advertisement"]',
    '[class*="advertisement"]',
    '[class*="advert"]',
    '[id*="advert"]',
    '[class*="ad-banner"]',
    '[class*="adbanner"]',
    '[id*="ad-banner"]',
    '[id*="adbanner"]',
    '[class*="ad-slot"]',
    '[id*="ad-slot"]',
    '[class*="adSlot"]',
    '[id*="adSlot"]',
    '[class*="ad-wrapper"]',
    '[id*="ad-wrapper"]',
    '[class*="ad-unit"]',
    '[id*="ad-unit"]',
    '[class*="adunit"]',
    '[id*="adunit"]',
    '[class*="ad-block"]',
    '[class*="adblock"]',
    '[id*="adblock"]',
    '[class*="sidebar-ad"]',
    '[id*="sidebar-ad"]',
    '[class*="top-ad"]',
    '[id*="top-ad"]',
    '[class*="bottom-ad"]',
    '[id*="bottom-ad"]',
    '[class*="header-ad"]',
    '[class*="footer-ad"]',
    '[class*="leaderboard"]',
    '[class*="skyscraper"]',
    '[class*="banner-ad"]',
    '[id*="banner-ad"]',
    '[class*="sponsor"]',
    '[id*="sponsor"]',
    '[class*="promoted"]',
    '[data-ad]',
    '[data-ad-unit]',
    '[data-ad-slot]',
    '[data-adunit]',
    '[data-advertisement]',
    // Specific networks
    'ins.adsbygoogle',
    '[id^="div-gpt-ad"]',
    '[id^="google_ads_iframe"]',
    '.taboola-widget',
    '#taboola-widget',
    '.outbrain-widget',
    '[data-outbrain-id]',
    '.rc-widget',
    // Sticky/floating ads
    '[class*="sticky-ad"]',
    '[class*="fixed-ad"]',
    '[class*="floating-ad"]',
    '[id*="sticky-ad"]',
    '[id*="floating-ad"]',
    // Video ads
    '[class*="video-ad"]',
    '[id*="video-ad"]',
    '[class*="preroll"]',
    '[id*="preroll"]',
  ];

  function injectCosmeticFilters() {
    const style = document.createElement("style");
    style.id = "iblockad-cosmetic";
    
    // Core blocking CSS
    let css = AD_SELECTORS.join(",\n") + " { display: none !important; visibility: hidden !important; }\n";
    
    // --- GIF PROTECTION RULE ---
    // This forces GIFs to stay visible even if they are inside a blocked container
    css += "img[src*='.gif'], img[data-src*='.gif'] { display: inline-block !important; visibility: visible !important; opacity: 1 !important; }";
    
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function hideAdElements() {
    AD_SELECTORS.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          // If the element contains a GIF, we DON'T hide it
          if (el.querySelector('img[src*=".gif"]')) return;

          if (el.style.display !== "none") {
            el.style.setProperty("display", "none", "important");
          }
        });
      } catch (e) {
        // Invalid selector, skip
      }
    });
  }

  function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldCheck = true;
          break;
        }
      }
      if (shouldCheck) hideAdElements();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
