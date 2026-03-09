// WyScout Spoiler Blocker - Content Script

(function () {
  const STORAGE_KEY = "wyscoutSpoilerBlockerEnabled";

  // Score pattern: "1 - 0", "2-1", "3 – 1", etc.
  // Matches 1-2 digit numbers separated by dash/en-dash/em-dash
  // Excludes colon to avoid matching times like "00:00" or "12:30"
  const SCORE_REGEX = /(\d{1,2})\s*[-–—]\s*(\d{1,2})/;

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

  // Wrap score text patterns in masking spans — scans ALL text nodes
  // in the subtree so scores are caught regardless of element/class structure
  function maskScoresInText(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    processTextNodes(root);
  }

  // Walk text nodes and wrap score patterns in masking spans
  function processTextNodes(el) {
    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT,
      null
    );
    const nodesToProcess = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      // Skip already-masked spans
      if (node.parentNode.classList?.contains("wyscout-score-text")) continue;
      if (
        SCORE_REGEX.test(node.textContent) &&
        node.textContent.trim().length > 0
      ) {
        nodesToProcess.push(node);
      }
    }

    for (const node of nodesToProcess) {
      const text = node.textContent;
      const match = text.match(SCORE_REGEX);
      if (!match) continue;

      const before = text.substring(0, match.index);
      const scoreText = match[0];
      const after = text.substring(match.index + scoreText.length);

      const fragment = document.createDocumentFragment();

      if (before) fragment.appendChild(document.createTextNode(before));

      const span = document.createElement("span");
      span.className = "wyscout-score-text";
      span.textContent = scoreText;
      fragment.appendChild(span);

      if (after) {
        const afterNode = document.createTextNode(after);
        fragment.appendChild(afterNode);
      }

      node.parentNode.replaceChild(fragment, node);
    }
  }

  // Add double-click-to-reveal on match rows and containers
  function addRevealListeners(root) {
    const rows = root.querySelectorAll(
      [
        ".matchtable-header",
        ".matchtable-default",
        '[class*="matchtable"]',
        ".matchF",
        ".gears-list-item",
        ".tsr-step2-matchTable",
      ].join(",")
    );

    rows.forEach((row) => {
      if (row.dataset.spoilerListener) return;
      row.dataset.spoilerListener = "true";

      row.addEventListener("dblclick", () => {
        row.classList.toggle("wyscout-spoiler-blocker--reveal");
      });
    });
  }

  // Process a DOM subtree for both CSS-hidden and text-embedded scores
  function processDOM(root) {
    addRevealListeners(root);
    maskScoresInText(root);
  }

  // Observe DOM for dynamically loaded content (WyScout is a SPA)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processDOM(node);
        }
      }
    }
  });

  // Periodic rescan catches scores injected via textContent/innerHTML
  // updates on existing elements that the childList observer misses
  setInterval(() => {
    processDOM(document.body);
  }, 1500);

  if (document.body) {
    processDOM(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      processDOM(document.body);
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
