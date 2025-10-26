// Tab Saver Pro
// Copyright (c) 2025 KERZOX. All rights reserved.

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
      });
      console.log("Tab Saver Pro: Fallback storage setup complete");
    } catch (fallbackError) {
      console.error(
        "Tab Saver Pro: Critical error - unable to initialize storage:",
        fallbackError
      );
    }
  }
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
