// WyScout Spoiler Blocker - Content Script

(function () {
  const STORAGE_KEY = "wyscoutSpoilerBlockerEnabled";

  // Score pattern: "1 - 0", "2-1", "0 : 3", "3 – 1", etc.
  // Matches 1-2 digit numbers separated by common score delimiters
  const SCORE_REGEX = /(\d{1,2})\s*[-–—:]\s*(\d{1,2})/;

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

  // Check if an element is inside a match-related context
  function isMatchContext(el) {
    return el.closest(
      [
        ".matchF",
        ".match",
        ".matchtable",
        ".matchtable-default",
        ".matchtable-header",
        ".tsr-step2-matchTable",
        ".gears-dataview.matchtable",
        '[class*="match"]',
      ].join(",")
    );
  }

  // Wrap score text patterns in masking spans within match-related elements
  function maskScoresInText(root) {
    // Elements that commonly contain embedded score text (e.g. "Team A 2 - 1 Team B")
    const selectors = [
      // Match list items (linear + aengine models)
      ".matchF .item-title",
      ".matchF .item-subtitle",
      ".matchF .item-detail",
      ".matchF .item-content",
      // TSR report wizard - match header
      ".tsr-step2-matchTable .data",
      // TSR report preview/print headers
      ".tsr-report .title h1",
      ".tsr-report .title h2",
      ".tsr-report .title h3",
      ".tsr-report .title-container h1",
      ".tsr-report .title-container h2",
      ".tsr-report .title-container h3",
      // TSR wizard step 1 - match title
      ".tsr-front .title h1",
      ".tsr-front .title h2",
      // Generic dialog match info
      ".gears-dialog .matchtable-header",
      ".gears-dialog .item-title",
      ".gears-dialog .item-subtitle",
      // Download dialog content
      ".gears-dialog .item-content",
      // Match detail headers
      ".gears-dataview.matchtable .data",
      ".gears-dataview.detail .data",
    ];

    const candidates = root.querySelectorAll(selectors.join(","));
    candidates.forEach((el) => {
      if (el.dataset.wssbProcessed) return;
      el.dataset.wssbProcessed = "true";
      processTextNodes(el);
    });

    // Also scan any element with a match-related class for score patterns
    const matchElements = root.querySelectorAll(
      '.matchF, [class*="match"], .gears-dialog'
    );
    matchElements.forEach((el) => {
      if (el.dataset.wssbScanned) return;
      el.dataset.wssbScanned = "true";

      // Find child text elements that might contain scores
      el.querySelectorAll(
        ".item-title, .item-subtitle, .item-detail, h1, h2, h3, .docked-title span"
      ).forEach((child) => {
        if (child.dataset.wssbProcessed) return;
        if (SCORE_REGEX.test(child.textContent)) {
          child.dataset.wssbProcessed = "true";
          processTextNodes(child);
        }
      });
    });
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
        ".gears-list-item.matchF",
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
