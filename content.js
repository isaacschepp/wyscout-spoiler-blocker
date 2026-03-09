// WyScout Spoiler Blocker - Content Script

(function () {
  const STORAGE_KEY = "wyscoutSpoilerBlockerEnabled";

  function applyState(enabled) {
    if (enabled) {
      document.documentElement.classList.remove(
        "wyscout-spoiler-blocker--disabled"
      );
    } else {
      document.documentElement.classList.add(
        "wyscout-spoiler-blocker--disabled"
      );
    }
  }

  // Load saved state (default: enabled)
  chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
    applyState(result[STORAGE_KEY]);
  });

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "toggleSpoilerBlocker") {
      applyState(message.enabled);
    }
  });

  // Add click-to-reveal behavior on score rows
  function addRevealListeners(root) {
    const rows = root.querySelectorAll(
      ".matchtable-header, .matchtable-default, [class*='matchtable']"
    );
    rows.forEach((row) => {
      if (row.dataset.spoilerListener) return;
      row.dataset.spoilerListener = "true";

      row.addEventListener("dblclick", () => {
        row.classList.toggle("wyscout-spoiler-blocker--reveal");
      });
    });
  }

  // Observe DOM for dynamically loaded content (WyScout is a SPA)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          addRevealListeners(node);
        }
      }
    }
  });

  if (document.body) {
    addRevealListeners(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      addRevealListeners(document.body);
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
