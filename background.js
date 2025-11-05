// Tab Saver Pro
// Copyright (c) 2025 KERZOX. All rights reserved.

// Auto-save state
let autoSaveEnabled = false;
let autoSaveIdleTime = 120; // seconds
let autoSaveShowNotification = true;
let lastAutoSaveTime = 0;
let idleStateListener = null;

// Initialize storage on install with error handling
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    // Check if this is a fresh install or update
    if (details.reason === "install") {
      console.log("Tab Saver Pro: Fresh installation detected");
      await chrome.storage.local.set({
        savedTabs: [],
        theme: "dark",
        font: "14px",
        autoSaveEnabled: false,
        autoSaveIdleTime: 120,
        autoSaveShowNotification: true,
      });
      console.log("Tab Saver Pro: Initial storage setup complete");
    } else if (details.reason === "update") {
      console.log(
        "Tab Saver Pro: Extension updated from",
        details.previousVersion
      );

      // Validate existing data after update
      const result = await chrome.storage.local.get([
        "savedTabs",
        "theme",
        "font",
        "autoSaveEnabled",
        "autoSaveIdleTime",
        "autoSaveShowNotification",
      ]);

      // Set defaults for missing values
      const updates = {};
      if (!result.savedTabs || !Array.isArray(result.savedTabs)) {
        updates.savedTabs = [];
      }
      if (!result.theme) {
        updates.theme = "dark";
      }
      if (!result.font) {
        updates.font = "14px";
      }
      if (result.autoSaveEnabled === undefined) {
        updates.autoSaveEnabled = false;
      }
      if (!result.autoSaveIdleTime) {
        updates.autoSaveIdleTime = 120;
      }
      if (result.autoSaveShowNotification === undefined) {
        updates.autoSaveShowNotification = true;
      }

      if (Object.keys(updates).length > 0) {
        await chrome.storage.local.set(updates);
        console.log("Tab Saver Pro: Storage updated with defaults:", updates);
      }
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error during installation/update:", error);

    // Fallback: try to set minimal defaults
    try {
      await chrome.storage.local.set({
        savedTabs: [],
        theme: "dark",
        font: "14px",
        autoSaveEnabled: false,
        autoSaveIdleTime: 120,
        autoSaveShowNotification: true,
      });
      console.log("Tab Saver Pro: Fallback storage setup complete");
    } catch (fallbackError) {
      console.error(
        "Tab Saver Pro: Critical error - unable to initialize storage:",
        fallbackError
      );
    }
  }

  // Initialize auto-save on install/update
  await initializeAutoSave();
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openTabs") {
    console.log(
      "Background: Received request to open tabs",
      request.tabs.length
    );

    // Open tabs from background script (has fewer restrictions)
    const openPromises = request.tabs.map(async (tab, index) => {
      try {
        console.log(`Background: Opening tab ${index + 1}: ${tab.title}`);
        const createdTab = await chrome.tabs.create({ url: tab.url });
        console.log(
          `Background: Successfully opened tab ${index + 1} with ID: ${
            createdTab.id
          }`
        );
        return { success: true, tab, createdTab };
      } catch (error) {
        console.error(`Background: Failed to open tab ${index + 1}:`, error);
        return { success: false, error: error.message, tab };
      }
    });

    Promise.allSettled(openPromises).then((results) => {
      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;
      const failCount = results.length - successCount;

      console.log(
        `Background: Tab opening complete: ${successCount} success, ${failCount} failed`
      );

      // Send results back to popup
      sendResponse({
        success: true,
        results: results,
        successCount: successCount,
        failCount: failCount,
      });
    });

    return true; // Keep message channel open for async response
  } else if (request.action === "updateAutoSaveSettings") {
    updateAutoSaveSettings(request.settings);
    sendResponse({ success: true });
    return true;
  }
});

// Error handler for any unhandled errors in the service worker
self.addEventListener("error", (event) => {
  console.error(
    "Tab Saver Pro: Unhandled error in service worker:",
    event.error
  );
});

self.addEventListener("unhandledrejection", (event) => {
  console.error(
    "Tab Saver Pro: Unhandled promise rejection in service worker:",
    event.reason
  );
});

// Initialize auto-save settings
async function initializeAutoSave() {
  try {
    const result = await chrome.storage.local.get([
      "autoSaveEnabled",
      "autoSaveIdleTime",
      "autoSaveShowNotification",
    ]);

    autoSaveEnabled = result.autoSaveEnabled || false;
    autoSaveIdleTime = result.autoSaveIdleTime || 120;
    autoSaveShowNotification =
      result.autoSaveShowNotification !== undefined
        ? result.autoSaveShowNotification
        : true;

    console.log("Tab Saver Pro: Auto-save initialized", {
      enabled: autoSaveEnabled,
      idleTime: autoSaveIdleTime,
      showNotification: autoSaveShowNotification,
    });

    // Set up idle detection if auto-save is enabled
    if (autoSaveEnabled) {
      startIdleDetection();
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error initializing auto-save:", error);
  }
}

// Start idle detection
function startIdleDetection() {
  // Set up idle detection interval
  chrome.idle.setDetectionInterval(autoSaveIdleTime);

  // Remove the old listener if exists
  if (idleStateListener) {
    chrome.idle.onStateChanged.removeListener(idleStateListener);
  }

  // Add new listener
  idleStateListener = async (state) => {
    console.log("Tab Saver Pro: Idle state changed to:", state);
    if (state === "idle" && autoSaveEnabled) {
      await performAutoSave();
    }
  };

  chrome.idle.onStateChanged.addListener(idleStateListener);
  console.log(
    "Tab Saver Pro: Idle detection started with interval:",
    autoSaveIdleTime,
    "seconds"
  );
}

// Stop the idle detection
function stopIdleDetection() {
  if (idleStateListener) {
    chrome.idle.onStateChanged.removeListener(idleStateListener);
    idleStateListener = null;
    console.log("Tab Saver Pro: Idle detection stopped");
  }
}

// Perform auto-save
async function performAutoSave() {
  try {
    // Prevent duplicate saves within a short period
    const now = Date.now();

    if (now - lastAutoSaveTime < 30000) {
      // 30 seconds minimum between auto-saves
      console.log("Tab Saver Pro: Auto-save skipped (too recent)");
      return;
    }

    console.log("Tab Saver Pro: Performing auto-save...");

    // Get all tabs from current window
    const tabs = await chrome.tabs.query({ currentWindow: true });

    if (!tabs || tabs.length === 0) {
      console.log("Tab Saver Pro: No tabs to auto-save");
      return;
    }

    // Get existing saved tabs
    const result = await chrome.storage.local.get(["savedTabs"]);
    const savedTabs = result.savedTabs || [];

    let added = 0;
    const newTabs = [...savedTabs];

    // Process each tab
    for (const tab of tabs) {
      const sanitizedTab = sanitizeTabData(tab);
      if (sanitizedTab && !newTabs.find((t) => t.url === sanitizedTab.url)) {
        newTabs.push(sanitizedTab);
        added++;
      }
    }

    // Save if we added any new tabs
    if (added > 0) {
      await chrome.storage.local.set({ savedTabs: newTabs });
      lastAutoSaveTime = now;

      console.log(`Tab Saver Pro: Auto-saved ${added} new tab(s)`);

      // Show notification if enabled
      if (autoSaveShowNotification) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "Tab Saver Pro - Auto-Save",
          message: `Automatically saved ${added} new tab(s)`,
          priority: 1,
        });
      }
    } else {
      console.log("Tab Saver Pro: No new tabs to auto-save");
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error during auto-save:", error);
  }
}

// Sanitize tab data (same logic as popup.js)
function sanitizeTabData(tab) {
  if (!tab || typeof tab.title !== "string" || typeof tab.url !== "string") {
    return null;
  }

  // Skip invalid URLs
  if (
    tab.url.length === 0 ||
    tab.url.length > 2048 ||
    tab.title.length > 500
  ) {
    return null;
  }

  // Skip chrome:// and other internal URLs
  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://") ||
    tab.url.startsWith("edge://") ||
    tab.url === "about:blank"
  ) {
    return null;
  }

  let favicon = tab.favIconUrl;
  if (!favicon && tab.url) {
    try {
      const urlObj = new URL(tab.url);
      if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
      }
    } catch (error) {
      favicon = null;
    }
  }

  return {
    title: String(tab.title || "Untitled").slice(0, 500),
    url: String(tab.url || "").slice(0, 2048),
    favicon: favicon || "",
    savedAt: Date.now(),
  };
}

// Update auto-save settings
async function updateAutoSaveSettings(settings) {
  try {
    if (settings.autoSaveEnabled !== undefined) {
      autoSaveEnabled = settings.autoSaveEnabled;
    }
    if (settings.autoSaveIdleTime !== undefined) {
      autoSaveIdleTime = settings.autoSaveIdleTime;
    }
    if (settings.autoSaveShowNotification !== undefined) {
      autoSaveShowNotification = settings.autoSaveShowNotification;
    }

    console.log("Tab Saver Pro: Auto-save settings updated", {
      enabled: autoSaveEnabled,
      idleTime: autoSaveIdleTime,
      showNotification: autoSaveShowNotification,
    });

    // Start or stop idle detection based on settings
    if (autoSaveEnabled) {
      startIdleDetection();
    } else {
      stopIdleDetection();
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error updating auto-save settings:", error);
  }
}

// Initialize auto-save on service worker startup
initializeAutoSave();
