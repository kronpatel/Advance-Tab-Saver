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
