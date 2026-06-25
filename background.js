// Tab Saver Pro
// Copyright (c) 2025 KERZOX. All rights reserved.

function checkFileSchemeAccess(callback) {
  try {
    const extAPI = typeof chrome !== "undefined" ? chrome : (typeof browser !== "undefined" ? browser : null);
    if (extAPI && extAPI.extension && typeof extAPI.extension.isAllowedFileSchemeAccess === "function") {
      extAPI.extension.isAllowedFileSchemeAccess((isAllowed) => {
        callback(!!isAllowed);
      });
    } else {
      callback(false);
    }
  } catch (e) {
    console.error("Error checking file scheme access:", e);
    callback(false);
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    // Explicitly restrict to safe web protocols, file support, and safe placeholder
    if (url.protocol === "http:" || url.protocol === "https:") {
      return true;
    }
    if (url.protocol === "file:") {
      return true;
    }
    if (url.protocol === "about:") {
      return url.href === "about:blank";
    }
    return false;
  } catch (_) {
    return false;
  }
}


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
  // SEC-05: Validate message origin — only accept messages from this extension's
  // own context. Prevents external web pages from triggering tab operations.
  if (!sender || sender.id !== chrome.runtime.id) {
    console.warn("Tab Saver Pro: Rejected message from unknown sender:", sender?.id);
    return false;
  }
  if (request.action === "openTabs") {
    console.log(
      "Background: Received request to open tabs",
      request.tabs.length
    );

    checkFileSchemeAccess((fileAccessAllowed) => {
      let skippedFileCount = 0;

      // Open tabs from background script (has fewer restrictions)
      const openPromises = request.tabs.map(async (tab, index) => {
        try {
          console.log(`Background: Opening tab ${index + 1}: ${tab.title}`);
          
          // Validate URL before attempting to open
          if (!tab.url || typeof tab.url !== 'string' || tab.url.length === 0) {
            console.warn(`Background: Invalid URL for tab ${index + 1}:`, tab.url);
            return { success: false, error: "Invalid URL", tab };
          }

          // Strict runtime protocol check
          if (!isValidUrl(tab.url)) {
            console.warn(`Background: Blocked unsafe protocol from opening:`, tab.url);
            return { success: false, error: "Blocked unsafe URL protocol", tab };
          }

          // Block file scheme if extension lacks file scheme privileges
          if (tab.url.startsWith("file://") && !fileAccessAllowed) {
            skippedFileCount++;
            console.warn(`Background: Skipped file:// URL during bulk restoration:`, tab.url);
            return { success: false, error: "Local file access disabled", tab };
          }

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
        const failCount = results.length - successCount - skippedFileCount;

        console.log(
          `Background: Tab opening complete: ${successCount} success, ${failCount} failed, ${skippedFileCount} skipped`
        );

        // Send results back to popup
        sendResponse({
          success: true,
          results: results,
          successCount: successCount,
          failCount: failCount,
          skippedFileCount: skippedFileCount
        });
      });
    });

    return true; // Keep message channel open for async response
  } else if (request.action === "updateAutoSaveSettings") {
    updateAutoSaveSettings(request.settings).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
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

    // BUG-08: chrome.runtime.lastError is always null after await — removed.
    // Any storage errors are caught by the surrounding try/catch block.
    const enabled = result.autoSaveEnabled || false;
    const idleTime = result.autoSaveIdleTime || 120;
    const showNotification =
      result.autoSaveShowNotification !== undefined
        ? result.autoSaveShowNotification
        : true;

    console.log("Tab Saver Pro: Auto-save initialized", {
      enabled: enabled,
      idleTime: idleTime,
      showNotification: showNotification,
    });

    if (enabled) {
      // MAN-05: chrome.idle.setDetectionInterval is not available in Firefox.
      // Guard with existence check and try/catch for cross-browser compatibility.
      try {
        if (typeof chrome.idle !== "undefined" && typeof chrome.idle.setDetectionInterval === "function") {
          chrome.idle.setDetectionInterval(idleTime);
        }
      } catch (e) {
        console.warn("Tab Saver Pro: chrome.idle.setDetectionInterval not available:", e);
      }
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
      // BUG-08: chrome.runtime.lastError is always null after await — removed.
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
      // BUG-08: chrome.runtime.lastError is always null after await — removed.
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
        // BUG-08: chrome.runtime.lastError is always null after await — removed.

        console.log(`Tab Saver Pro: Auto-saved ${added} new tab(s)`);

        // Show notification if enabled
        const storageResult = await chrome.storage.local.get(["autoSaveShowNotification"]);
        const showNotification = storageResult.autoSaveShowNotification !== false;
        if (showNotification) {
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
  if (!isValidUrl(tab.url)) {
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
    console.log("Tab Saver Pro: Auto-save settings updated", settings);

    const enabled = settings.autoSaveEnabled !== undefined ? settings.autoSaveEnabled : false;
    const idleTime = settings.autoSaveIdleTime !== undefined ? settings.autoSaveIdleTime : 120;

    if (enabled) {
      // MAN-05: Guard for Firefox — chrome.idle.setDetectionInterval may not exist.
      try {
        if (typeof chrome.idle !== "undefined" && typeof chrome.idle.setDetectionInterval === "function") {
          chrome.idle.setDetectionInterval(idleTime);
        }
      } catch (e) {
        console.warn("Tab Saver Pro: chrome.idle.setDetectionInterval not available:", e);
      }
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

// BUG-04: Flag to prevent the local↔sync settings mirroring from creating an
// infinite write loop. When we mirror local→sync, the sync.onChanged event
// fires and would normally mirror sync→local again, triggering local.onChanged,
// causing an infinite cycle. The flag gates entry into the handler.
// setTimeout(0) defers the reset so any queued echo events see the flag as true.
let _syncMirrorInProgress = false;

// Auto-sync settings dynamically between local and sync areas
chrome.storage.onChanged.addListener(async (changes, area) => {
  // BUG-04: Skip if this change was triggered by our own mirroring write.
  if (_syncMirrorInProgress) return;
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
        _syncMirrorInProgress = true;
        try {
          await chrome.storage.sync.set(syncUpdates);
        } finally {
          // Defer reset: ensures any synchronously-queued echo onChanged events
          // from the write above are processed while the flag is still true.
          setTimeout(() => { _syncMirrorInProgress = false; }, 0);
        }
      }
    } else if (area === "sync") {
      const localUpdates = {};
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(changes, key)) {
          localUpdates[key] = changes[key].newValue;
        }
      }
      if (Object.keys(localUpdates).length > 0) {
        _syncMirrorInProgress = true;
        try {
          await chrome.storage.local.set(localUpdates);
          if (
            localUpdates.autoSaveEnabled !== undefined ||
            localUpdates.autoSaveIdleTime !== undefined ||
            localUpdates.autoSaveShowNotification !== undefined
          ) {
            await initializeAutoSave();
          }
        } finally {
          setTimeout(() => { _syncMirrorInProgress = false; }, 0);
        }
      }
    }
  } catch (error) {
    // Reset flag on error — prevents permanent lock if an exception occurs
    // before the finally/setTimeout cleanup runs.
    _syncMirrorInProgress = false;
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
    // Validate inputs
    if (!Array.isArray(savedTabs)) {
      console.warn("Tab Saver Pro: performBackup received invalid savedTabs. Coercing to empty array.");
      savedTabs = [];
    }
    if (!Array.isArray(savedSessions)) {
      console.warn("Tab Saver Pro: performBackup received invalid savedSessions. Coercing to empty array.");
      savedSessions = [];
    }
    
    const validatedTabs = savedTabs.filter(t => t && typeof t === "object" && typeof t.url === "string" && typeof t.title === "string");
    const validatedSessions = savedSessions.filter(s => s && typeof s === "object" && Array.isArray(s.tabs));

    const now = Date.now();
    const newBackup = {
      backupId: now,
      createdAt: new Date().toISOString(),
      tabCount: validatedTabs.length,
      sessionCount: validatedSessions.length,
      backupData: { savedTabs: validatedTabs, savedSessions: validatedSessions }
    };
    
    const maxBackups = parseInt(settings.maxBackups, 10) || 10;
    const updatedHistory = [newBackup, ...(backupHistory || [])].slice(0, maxBackups);
    
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
    
    let savedTabs = result.savedTabs;
    if (!Array.isArray(savedTabs)) {
      console.warn("Tab Saver Pro: performManualBackup found invalid savedTabs in storage. Coercing to empty array.");
      savedTabs = [];
    }
    let savedSessions = result.savedSessions;
    if (!Array.isArray(savedSessions)) {
      console.warn("Tab Saver Pro: performManualBackup found invalid savedSessions in storage. Coercing to empty array.");
      savedSessions = [];
    }
    
    const validatedTabs = savedTabs.filter(t => t && typeof t === "object" && typeof t.url === "string" && typeof t.title === "string");
    const validatedSessions = savedSessions.filter(s => s && typeof s === "object" && Array.isArray(s.tabs));
    
    const now = Date.now();
    const newBackup = {
      backupId: now,
      createdAt: new Date().toISOString(),
      tabCount: validatedTabs.length,
      sessionCount: validatedSessions.length,
      backupData: { 
        savedTabs: validatedTabs, 
        savedSessions: validatedSessions 
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