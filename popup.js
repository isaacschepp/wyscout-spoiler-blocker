const STORAGE_KEY = "wyscoutSpoilerBlockerEnabled";
const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

function updateUI(enabled) {
  toggle.checked = enabled;
  status.textContent = enabled ? "Scores are hidden" : "Scores are visible";
  status.className = "status " + (enabled ? "on" : "off");
}

// Load current state
chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
  updateUI(result[STORAGE_KEY]);
});

// Handle toggle
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ [STORAGE_KEY]: enabled });
  updateUI(enabled);

  // Notify content script on active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "toggleSpoilerBlocker",
        enabled,
      });
    }
  });
});
