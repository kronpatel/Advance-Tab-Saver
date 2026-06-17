// Tab Saver Pro
// Copyright (c) 2025 KERZOX. All rights reserved.

// Normalize URL for robust duplicate comparison
function normalizeUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return "";
  try {
    const url = new URL(urlStr);
    let pathname = url.pathname;
    if (pathname.endsWith("/") && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }
    const params = new URLSearchParams(url.search);
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref"
    ];
    let changed = false;
    trackingParams.forEach((param) => {
      if (params.has(param)) {
        params.delete(param);
        changed = true;
      }
    });
    const search = changed
      ? params.toString()
        ? "?" + params.toString()
        : ""
      : url.search;
    return `${url.protocol}//${url.hostname}${url.port ? ":" + url.port : ""}${pathname}${search}${url.hash}`;
  } catch (e) {
    let cleaned = urlStr.trim();
    if (cleaned.endsWith("/") && cleaned.length > 1) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  }
}

// Auto-save state
let autoSaveEnabled = false;
let autoSaveIdleTime = 120; // seconds
let autoSaveShowNotification = true;

// Synchronously register the idle state change listener at the top level for MV3 reliability
chrome.idle.onStateChanged.addListener(async (state) => {
  console.log("Tab Saver Pro: Idle state changed to:", state);
  try {
    const result = await chrome.storage.local.get(["autoSaveEnabled"]);
    if (result.autoSaveEnabled && state === "idle") {
      await performAutoSave();
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error in idle state listener:", error);
  }
});

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
        autoBackupSettings: {
          enabled: false,
          frequency: "daily",
          maxBackups: 10,
          lastBackupTime: 0
        },
        backupHistory: [],
        recentlySaved: [],
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
        "autoBackupSettings",
        "backupHistory",
        "recentlySaved",
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
      if (!result.autoBackupSettings) {
        updates.autoBackupSettings = {
          enabled: false,
          frequency: "daily",
          maxBackups: 10,
          lastBackupTime: 0
        };
      }
      if (!result.backupHistory) {
        updates.backupHistory = [];
      }
      if (!result.recentlySaved) {
        updates.recentlySaved = [];
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
        autoBackupSettings: {
          enabled: false,
          frequency: "daily",
          maxBackups: 10,
          lastBackupTime: 0
        },
        backupHistory: [],
        recentlySaved: [],
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
        
        // Validate URL before attempting to open
        if (!tab.url || typeof tab.url !== 'string' || tab.url.length === 0) {
          console.warn(`Background: Invalid URL for tab ${index + 1}:`, tab.url);
          return { success: false, error: "Invalid URL", tab };
        }

        const createdTab = await chrome.tabs.create({ url: tab.url });
        
        if (chrome.runtime.lastError) {
          console.warn(`Background: Tab creation error for tab ${index + 1}:`, chrome.runtime.lastError.message);
          return { success: false, error: chrome.runtime.lastError.message, tab };
        }

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
  } else if (request.action === "updateAutoBackupSettings") {
    updateAutoBackupSettings(request.settings).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  } else if (request.action === "triggerManualBackup") {
    performManualBackup().then((backup) => {
      sendResponse({ success: true, backup });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
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

    if (chrome.runtime.lastError) {
      console.warn("Tab Saver Pro: Error loading auto-save settings:", chrome.runtime.lastError.message);
      return;
    }

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

    if (autoSaveEnabled) {
      chrome.idle.setDetectionInterval(autoSaveIdleTime);
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error initializing auto-save:", error);
  }
}

// Perform auto-save
async function performAutoSave() {
  try {
    const now = Date.now();

    // Prevent duplicate saves within a short period, persisting cooldown in local storage
    const cooldownResult = await chrome.storage.local.get(["lastAutoSaveTime"]);
    const lastAutoSaveTime = cooldownResult.lastAutoSaveTime || 0;

    if (now - lastAutoSaveTime < 30000) {
      // 30 seconds minimum between auto-saves
      console.log("Tab Saver Pro: Auto-save skipped (too recent)");
      return;
    }

    console.log("Tab Saver Pro: Performing auto-save...");

    // Get all tabs from current window
    let tabs;
    try {
      tabs = await chrome.tabs.query({ currentWindow: true });
      if (chrome.runtime.lastError) {
        console.warn("Tab Saver Pro: Error querying tabs:", chrome.runtime.lastError.message);
        return;
      }
    } catch (error) {
      console.error("Tab Saver Pro: Error querying tabs:", error);
      return;
    }

    if (!tabs || tabs.length === 0) {
      console.log("Tab Saver Pro: No tabs to auto-save");
      return;
    }

    // Get existing saved tabs
    let result;
    try {
      result = await chrome.storage.local.get(["savedTabs"]);
      if (chrome.runtime.lastError) {
        console.warn("Tab Saver Pro: Error getting saved tabs:", chrome.runtime.lastError.message);
        return;
      }
    } catch (error) {
      console.error("Tab Saver Pro: Error getting saved tabs:", error);
      return;
    }
    const savedTabs = result.savedTabs || [];

    let added = 0;
    const newTabs = [...savedTabs];
    const addedTabsList = [];

    // Process each tab using normalized URL comparison to prevent duplicates
    for (const tab of tabs) {
      const sanitizedTab = sanitizeTabData(tab);
      if (sanitizedTab) {
        const normalizedSanitized = normalizeUrl(sanitizedTab.url);
        if (!newTabs.find((t) => normalizeUrl(t.url) === normalizedSanitized)) {
          newTabs.push(sanitizedTab);
          addedTabsList.push(sanitizedTab);
          added++;
        }
      }
    }

    // Save if we added any new tabs
    if (added > 0) {
      try {
        await chrome.storage.local.set({ 
          savedTabs: newTabs,
          lastAutoSaveTime: now
        });
        await updateRecentlySaved(addedTabsList);
        if (chrome.runtime.lastError) {
          console.warn("Tab Saver Pro: Error saving tabs:", chrome.runtime.lastError.message);
          return;
        }

        console.log(`Tab Saver Pro: Auto-saved ${added} new tab(s)`);

        // Show notification if enabled
        if (autoSaveShowNotification) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: "Tab Saver Pro - Auto-Save",
            message: `Automatically saved ${added} new tab(s)`,
            priority: 1,
          }, (notificationId) => {
            if (chrome.runtime.lastError) {
              console.warn("Tab Saver Pro: Error creating notification:", chrome.runtime.lastError.message);
            }
          });
        }
      } catch (error) {
        console.error("Tab Saver Pro: Error saving tabs:", error);
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

    if (autoSaveEnabled) {
      chrome.idle.setDetectionInterval(autoSaveIdleTime);
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error updating auto-save settings:", error);
  }
}

// Initialize auto-save on service worker startup
initializeAutoSave();

// ======= Local + Sync Hybrid for Settings (NOT savedTabs) =======
async function reconcileLocalAndSyncSettings() {
  try {
    const keys = [
      "theme",
      "font",
      "autoSaveEnabled",
      "autoSaveIdleTime",
      "autoSaveShowNotification",
    ];
    const local = await chrome.storage.local.get(keys);
    const sync = await chrome.storage.sync.get(keys);

    const updates = {};
    for (const key of keys) {
      if (sync[key] !== undefined && local[key] === undefined) {
        updates[key] = sync[key];
      } else if (local[key] !== undefined && sync[key] === undefined) {
        try {
          await chrome.storage.sync.set({ [key]: local[key] });
        } catch (syncError) {
          console.warn(`Tab Saver Pro: Error setting sync key ${key}:`, syncError);
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
      console.log("Tab Saver Pro: Settings reconciled from sync storage:", updates);
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error reconciling settings:", error);
  }
}

// Compare on startup and keep sync updated when local changes
chrome.runtime.onStartup.addListener(() => {
  reconcileLocalAndSyncSettings();
});

// Also reconcile when the service worker starts (cold start)
reconcileLocalAndSyncSettings();

// Auto-sync settings dynamically between local and sync areas
chrome.storage.onChanged.addListener(async (changes, area) => {
  try {
    const keys = [
      "theme",
      "font",
      "autoSaveEnabled",
      "autoSaveIdleTime",
      "autoSaveShowNotification",
    ];

    if (area === "local") {
      const syncUpdates = {};
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(changes, key)) {
          syncUpdates[key] = changes[key].newValue;
        }
      }
      if (Object.keys(syncUpdates).length > 0) {
        await chrome.storage.sync.set(syncUpdates);
      }
    } else if (area === "sync") {
      const localUpdates = {};
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(changes, key)) {
          localUpdates[key] = changes[key].newValue;
        }
      }
      if (Object.keys(localUpdates).length > 0) {
        await chrome.storage.local.set(localUpdates);
        if (
          localUpdates.autoSaveEnabled !== undefined ||
          localUpdates.autoSaveIdleTime !== undefined ||
          localUpdates.autoSaveShowNotification !== undefined
        ) {
          await initializeAutoSave();
        }
      }
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error in storage.onChanged handler:", error);
  }
});

// ======= Auto-Backup and Recently Saved Support =======

// Synchronously register the alarm listener at the top-level scope
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "autoBackupAlarm") {
    console.log("Tab Saver Pro: Alarm autoBackupAlarm triggered");
    await checkAndPerformAutoBackup();
  }
});

// Initialize auto-backup alarm
async function initializeAutoBackupAlarm() {
  try {
    const result = await chrome.storage.local.get(["autoBackupSettings"]);
    const settings = result.autoBackupSettings || {
      enabled: false,
      frequency: "daily",
      maxBackups: 10,
      lastBackupTime: 0
    };
    
    await chrome.alarms.clear("autoBackupAlarm");
    
    if (settings.enabled) {
      // Run every 60 minutes to check if backup threshold has passed
      chrome.alarms.create("autoBackupAlarm", { periodInMinutes: 60 });
      console.log("Tab Saver Pro: Scheduled auto backup alarm (60 min check interval)");
      
      // Perform immediate check on startup in case scheduling was missed
      await checkAndPerformAutoBackup();
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error initializing auto backup alarm:", error);
  }
}

// Update auto-backup settings
async function updateAutoBackupSettings(settings) {
  try {
    const result = await chrome.storage.local.get(["autoBackupSettings"]);
    const current = result.autoBackupSettings || {};
    const updated = { ...current, ...settings };
    
    await chrome.storage.local.set({ autoBackupSettings: updated });
    console.log("Tab Saver Pro: Auto-backup settings updated", updated);
    
    await initializeAutoBackupAlarm();
  } catch (error) {
    console.error("Tab Saver Pro: Error updating auto-backup settings:", error);
    throw error;
  }
}

// Check and perform scheduled auto backup
async function checkAndPerformAutoBackup() {
  try {
    const result = await chrome.storage.local.get(["autoBackupSettings", "savedTabs", "savedSessions", "backupHistory"]);
    const settings = result.autoBackupSettings || {
      enabled: false,
      frequency: "daily",
      maxBackups: 10,
      lastBackupTime: 0
    };
    
    if (!settings.enabled) return;
    
    const now = Date.now();
    const lastBackup = settings.lastBackupTime || 0;
    const interval = settings.frequency === "weekly" 
      ? 7 * 24 * 60 * 60 * 1000 
      : 24 * 60 * 60 * 1000;
      
    if (now - lastBackup >= interval) {
      await performBackup(result.savedTabs || [], result.savedSessions || [], settings, result.backupHistory || []);
    }
  } catch (error) {
    console.error("Tab Saver Pro: Error checking auto backup:", error);
  }
}

// Perform backup core logic
async function performBackup(savedTabs, savedSessions, settings, backupHistory) {
  try {
    const now = Date.now();
    const newBackup = {
      backupId: now,
      createdAt: new Date().toISOString(),
      tabCount: savedTabs.length,
      sessionCount: savedSessions.length,
      backupData: { savedTabs, savedSessions }
    };
    
    const maxBackups = parseInt(settings.maxBackups, 10) || 10;
    const updatedHistory = [newBackup, ...backupHistory].slice(0, maxBackups);
    
    settings.lastBackupTime = now;
    
    await chrome.storage.local.set({
      backupHistory: updatedHistory,
      autoBackupSettings: settings
    });
    
    console.log("Tab Saver Pro: Scheduled auto backup created successfully at", new Date(now).toLocaleString());
  } catch (error) {
    console.error("Tab Saver Pro: Error performing auto backup:", error);
  }
}

// Perform manual backup
async function performManualBackup() {
  try {
    const result = await chrome.storage.local.get(["autoBackupSettings", "savedTabs", "savedSessions", "backupHistory"]);
    const settings = result.autoBackupSettings || {
      enabled: false,
      frequency: "daily",
      maxBackups: 10,
      lastBackupTime: 0
    };
    
    const now = Date.now();
    const newBackup = {
      backupId: now,
      createdAt: new Date().toISOString(),
      tabCount: (result.savedTabs || []).length,
      sessionCount: (result.savedSessions || []).length,
      backupData: { 
        savedTabs: result.savedTabs || [], 
        savedSessions: result.savedSessions || [] 
      }
    };
    
    const maxBackups = parseInt(settings.maxBackups, 10) || 10;
    const backupHistory = result.backupHistory || [];
    const updatedHistory = [newBackup, ...backupHistory].slice(0, maxBackups);
    
    settings.lastBackupTime = now;
    
    await chrome.storage.local.set({
      backupHistory: updatedHistory,
      autoBackupSettings: settings
    });
    
    console.log("Tab Saver Pro: Manual backup created successfully");
    return newBackup;
  } catch (error) {
    console.error("Tab Saver Pro: Error performing manual backup:", error);
    throw error;
  }
}

// Update recently saved list
async function updateRecentlySaved(newTabs) {
  if (!newTabs || newTabs.length === 0) return;
  try {
    const result = await chrome.storage.local.get(["recentlySaved"]);
    const current = result.recentlySaved || [];
    
    const formattedNew = newTabs.map(t => ({
      title: t.title || "Untitled",
      url: t.url,
      favicon: t.favicon || "",
      savedAt: t.savedAt || Date.now()
    }));
    
    let merged = [...formattedNew, ...current];
    
    const unique = [];
    const seenUrls = new Set();
    for (const item of merged) {
      const norm = normalizeUrl(item.url);
      if (!seenUrls.has(norm)) {
        seenUrls.add(norm);
        unique.push(item);
      }
    }
    
    const finalRecentlySaved = unique.slice(0, 10);
    await chrome.storage.local.set({ recentlySaved: finalRecentlySaved });
  } catch (error) {
    console.error("Tab Saver Pro: Error updating recently saved tabs:", error);
  }
}

// Initialize alarm on startup
initializeAutoBackupAlarm();