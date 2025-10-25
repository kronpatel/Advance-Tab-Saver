// ======= Constants =======
const DEFAULT_FAVICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ddd"/></svg>';
const MAX_SAVED_TABS = 1000;

// ======= DOM Elements =======
const tabList = document.getElementById("tabList");
const tabCount = document.getElementById("tabCount");
const totalTabs = document.getElementById("totalTabs");
const themeSelect = document.getElementById("themeSelect");
const fontSelect = document.getElementById("fontSelect");
const searchInput = document.getElementById("searchInput");
const openAllBtn = document.getElementById("openAllBtn");
const saveAllBtn = document.getElementById("saveAllBtn");
const saveCurrentBtn = document.getElementById("saveCurrentBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const clearBtn = document.getElementById("clearBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const messageBar = document.getElementById("messageBar");

// Google Sign-In
const googleSignInBtn = document.getElementById("googleSignInBtn");
const googleSignOutBtn = document.getElementById("googleSignOutBtn");
const googleUserInfo = document.getElementById("googleUserInfo");

// Sync buttons
const syncToDriveBtn = document.getElementById("syncToDriveBtn");
const restoreFromDriveBtn = document.getElementById("restoreFromDriveBtn");

// Tabs for Actions/Statistics
const actionsTab = document.getElementById("actionsTab");
const statsTab = document.getElementById("statsTab");
const actionsContent = document.getElementById("actionsContent");
const statsContent = document.getElementById("statsContent");

// ======= DOM Validation =======
function validateDOMElements() {
  const requiredElements = [
    "tabList",
    "tabCount",
    "messageBar",
    "saveCurrentBtn",
    "saveAllBtn",
  ];

  const missing = requiredElements.filter((id) => !document.getElementById(id));
  if (missing.length > 0) {
    console.error("Missing DOM elements:", missing);
    return false;
  }
  return true;
}

// ======= Message Bar Function =======
function showMessage(msg, type = "info", duration = 3000) {
  if (!messageBar) {
    console.error("Message bar not found, message:", msg);
    return;
  }
  messageBar.textContent = msg;
  messageBar.className = "ag-message " + type;
  messageBar.style.display = "block";
  setTimeout(() => {
    messageBar.style.display = "none";
  }, duration);
}

// ======= Error Handling & Validation Utilities =======
function isValidUrl(string) {
  try {
    const url = new URL(string);
    // Allow common web protocols and browser internal URLs
    const allowedProtocols = [
      "http:",
      "https:",
      "chrome:",
      "chrome-extension:",
      "moz-extension:",
      "about:",
      "file:",
      "ftp:",
    ];
    return allowedProtocols.includes(url.protocol);
  } catch (_) {
    return false;
  }
}

function isValidTab(tab) {
  if (!tab || typeof tab.title !== "string" || typeof tab.url !== "string") {
    return false;
  }

  // Basic length checks
  if (tab.url.length === 0 || tab.url.length > 2048 || tab.title.length > 500) {
    return false;
  }

  // More permissive URL validation - accept any URL with a protocol
  // or any string that looks like a URL
  return (
    isValidUrl(tab.url) ||
    tab.url.includes("://") ||
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("about:") ||
    tab.url.startsWith("file://") ||
    tab.url.startsWith("data:")
  );
}

function sanitizeTabData(tab) {
  if (!tab) return null;

  let favicon = tab.favicon;
  if (!favicon && tab.url) {
    try {
      const urlObj = new URL(tab.url);
      // Only use Google favicon service for http/https URLs
      if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
      } else {
        favicon = DEFAULT_FAVICON;
      }
    } catch (error) {
      favicon = DEFAULT_FAVICON;
    }
  }

  const sanitized = {
    title: String(tab.title || "Untitled").slice(0, 500),
    url: String(tab.url || "").slice(0, 2048),
    favicon: favicon || DEFAULT_FAVICON,
    savedAt: Date.now(),
  };

  const isValid = isValidTab(sanitized);
  if (!isValid) {
    console.log("Tab validation failed for:", sanitized);
  }

  return isValid ? sanitized : null;
}

async function safeStorageOperation(operation, errorContext) {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(`Storage error in ${errorContext}:`, error);

    if (error.message && error.message.includes("QUOTA_BYTES_PER_ITEM")) {
      showMessage(
        "Storage limit reached! Please delete some tabs.",
        "warning",
        5000
      );
    } else if (error.message && error.message.includes("QUOTA_BYTES")) {
      showMessage(
        "Extension storage is full! Please clear some data.",
        "warning",
        5000
      );
    } else {
      showMessage(`Error ${errorContext}. Please try again.`, "warning");
    }

    return { success: false, error: error.message };
  }
}

async function validateStorageData() {
  try {
    const { savedTabs = [] } = await chrome.storage.local.get(["savedTabs"]);

    if (!Array.isArray(savedTabs)) {
      await chrome.storage.local.set({ savedTabs: [] });
      return [];
    }

    const validTabs = savedTabs.filter((tab) => {
      return isValidTab(tab);
    });

    if (validTabs.length !== savedTabs.length) {
      await chrome.storage.local.set({ savedTabs: validTabs });
    }

    return validTabs;
  } catch (error) {
    console.error("Error validating storage data:", error);
    showMessage(
      "Error loading saved tabs. Storage may be corrupted.",
      "warning"
    );
    return [];
  }
}

// ======= Tab Switching =======
actionsTab.onclick = () => {
  actionsTab.classList.add("ag-tab-btn-active");
  statsTab.classList.remove("ag-tab-btn-active");
  actionsContent.style.display = "";
  statsContent.style.display = "none";
};
statsTab.onclick = async () => {
  statsTab.classList.add("ag-tab-btn-active");
  actionsTab.classList.remove("ag-tab-btn-active");
  actionsContent.style.display = "none";
  statsContent.style.display = "";

  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading statistics"
    );

    if (!result.success) {
      document.getElementById("statsTotal").textContent = "Error";
      document.getElementById("statsLast").textContent = "Error";
      return;
    }

    const { savedTabs = [] } = result.data;
    const validTabs = savedTabs.filter(isValidTab);

    document.getElementById("statsTotal").textContent = validTabs.length;

    if (validTabs.length > 0) {
      const lastTab = validTabs[validTabs.length - 1];
      const lastSaved = lastTab.savedAt
        ? new Date(lastTab.savedAt).toLocaleString()
        : "Unknown";
      document.getElementById("statsLast").textContent = lastSaved;
    } else {
      document.getElementById("statsLast").textContent = "N/A";
    }
  } catch (error) {
    console.error("Error loading statistics:", error);
    document.getElementById("statsTotal").textContent = "Error";
    document.getElementById("statsLast").textContent = "Error";
    showMessage("Failed to load statistics", "warning");
  }
};

// ======= Render Tabs =======
function renderTabs(tabs) {
  try {
    tabList.innerHTML = "";

    if (!Array.isArray(tabs)) {
      tabs = [];
    }

    const validTabs = tabs.filter(isValidTab);

    const grouped = {};
    validTabs.forEach((tab) => {
      try {
        const date = new Date(tab.savedAt).toLocaleDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(tab);
      } catch (error) {
        // Skip invalid date, tab will be ungrouped
      }
    });

    for (const date in grouped) {
      try {
        const group = document.createElement("div");
        group.className = "tab-group";
        const header = document.createElement("h4");
        header.textContent = date;
        group.appendChild(header);

        grouped[date].forEach((tab) => {
          try {
            const div = document.createElement("div");
            div.className = "tab";

            const img = document.createElement("img");
            img.className = "favicon";
            img.src = tab.favicon || DEFAULT_FAVICON;
            img.onerror = () => {
              img.src = DEFAULT_FAVICON;
            };

            const titleSpan = document.createElement("span");
            titleSpan.title = tab.url;
            titleSpan.textContent = tab.title || "Untitled";

            const openBtn = document.createElement("button");
            openBtn.dataset.url = tab.url;
            openBtn.className = "open";
            openBtn.title = "Open";
            openBtn.innerHTML =
              '<span class="material-icons">open_in_new</span>';

            const deleteBtn = document.createElement("button");
            deleteBtn.dataset.url = tab.url;
            deleteBtn.className = "delete";
            deleteBtn.title = "Delete";
            deleteBtn.innerHTML = '<span class="material-icons">delete</span>';

            div.appendChild(img);
            div.appendChild(titleSpan);
            div.appendChild(openBtn);
            div.appendChild(deleteBtn);

            group.appendChild(div);
          } catch (error) {
            // Skip rendering this tab if there's an error
          }
        });

        tabList.appendChild(group);
      } catch (error) {
        // Skip rendering this group if there's an error
      }
    }

    tabCount.textContent = validTabs.length;
    if (totalTabs) totalTabs.textContent = `Total saved: ${validTabs.length}`;
  } catch (error) {
    console.error("Error in renderTabs:", error);
    tabList.innerHTML =
      '<div style="padding: 20px; text-align: center; color: #999;">Error loading tabs</div>';
    tabCount.textContent = "0";
    if (totalTabs) totalTabs.textContent = "Total saved: 0";
  }
}

// ======= Load Tabs =======
async function loadTabs() {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs", "theme", "font"]),
      "loading tabs"
    );

    if (!result.success) {
      renderTabs([]);
      return;
    }

    const { savedTabs, theme = "dark", font = "14px" } = result.data;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.setProperty("--font-size", font);

    // Validate and clean data
    const validatedTabs = await validateStorageData();
    renderTabs(validatedTabs);
  } catch (error) {
    console.error("Error in loadTabs:", error);
    showMessage("Failed to load saved tabs", "warning");
    renderTabs([]);
  }
}

// ======= Tab List Actions =======
tabList.addEventListener("click", async (e) => {
  try {
    if (e.target.closest(".open")) {
      const url = e.target.closest(".open").dataset.url;
      if (!isValidUrl(url)) {
        showMessage("Invalid URL cannot be opened", "warning");
        return;
      }
      await chrome.tabs.create({ url });
      showMessage("Tab opened!", "success");
    } else if (e.target.closest(".delete")) {
      const url = e.target.closest(".delete").dataset.url;

      const result = await safeStorageOperation(
        () => chrome.storage.local.get(["savedTabs"]),
        "loading tabs for deletion"
      );

      if (!result.success) return;

      const { savedTabs = [] } = result.data;
      const filtered = savedTabs.filter((t) => t.url !== url);

      const saveResult = await safeStorageOperation(
        () => chrome.storage.local.set({ savedTabs: filtered }),
        "deleting tab"
      );

      if (saveResult.success) {
        // Remove the tab element from the DOM for better performance
        const tabDiv = tabList
          .querySelector(`.tab button.delete[data-url="${url}"]`)
          ?.closest(".tab");
        if (tabDiv) {
          tabDiv.remove();
          // Update tab count
          const newCount = tabList.querySelectorAll(".tab").length;
          tabCount.textContent = newCount;
          if (totalTabs) totalTabs.textContent = `Total saved: ${newCount}`;
        }
        showMessage("Tab deleted!", "success");
      }
    }
  } catch (error) {
    console.error("Error in tab list action:", error);
    showMessage("Operation failed. Please try again.", "warning");
  }
});

// ======= Save Current Tab =======
saveCurrentBtn.onclick = async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      showMessage("No active tab found", "warning");
      return;
    }

    const sanitizedTab = sanitizeTabData(tab);
    if (!sanitizedTab) {
      console.log("Failed to sanitize tab:", tab);
      // More specific error message
      if (!tab.url || tab.url.length === 0) {
        showMessage("Cannot save tab: URL is empty", "warning");
      } else if (!tab.title || tab.title.length === 0) {
        showMessage("Cannot save tab: Title is empty", "warning");
      } else if (tab.url.length > 2048) {
        showMessage("Cannot save tab: URL is too long", "warning");
      } else {
        showMessage(
          `Cannot save this tab: ${tab.title} (${tab.url})`,
          "warning"
        );
      }
      return;
    }

    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading tabs to check duplicates"
    );

    if (!result.success) return;

    const { savedTabs = [] } = result.data;

    if (savedTabs.find((t) => t.url === sanitizedTab.url)) {
      showMessage("This tab is already saved!", "warning");
      return;
    }

    // Check storage limits
    if (savedTabs.length >= MAX_SAVED_TABS) {
      showMessage(
        `Maximum number of saved tabs reached (${MAX_SAVED_TABS}). Please delete some tabs.`,
        "warning",
        5000
      );
      return;
    }

    savedTabs.push(sanitizedTab);

    const saveResult = await safeStorageOperation(
      () => chrome.storage.local.set({ savedTabs }),
      "saving current tab"
    );

    if (saveResult.success) {
      loadTabs();
      showMessage("Tab saved!", "success");
    }
  } catch (error) {
    console.error("Error saving current tab:", error);
    showMessage("Failed to save tab. Please try again.", "warning");
  }
};

// ======= Save All Tabs =======
saveAllBtn.onclick = async () => {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    if (!tabs || tabs.length === 0) {
      showMessage("No tabs found to save", "warning");
      return;
    }

    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading existing saved tabs"
    );

    if (!result.success) return;

    const { savedTabs = [] } = result.data;

    let added = 0,
      skipped = 0,
      invalid = 0;
    const newTabs = [...savedTabs];

    for (const tab of tabs) {
      const sanitizedTab = sanitizeTabData(tab);

      if (!sanitizedTab) {
        invalid++;
        continue;
      }

      if (newTabs.find((t) => t.url === sanitizedTab.url)) {
        skipped++;
      } else {
        // Check total limit
        if (newTabs.length >= MAX_SAVED_TABS) {
          showMessage(
            `Stopped at ${MAX_SAVED_TABS} tabs limit. ${added} saved, ${
              tabs.length - added - skipped - invalid
            } remaining.`,
            "warning",
            5000
          );
          break;
        }
        newTabs.push(sanitizedTab);
        added++;
      }
    }

    if (added > 0) {
      const saveResult = await safeStorageOperation(
        () => chrome.storage.local.set({ savedTabs: newTabs }),
        "saving all tabs"
      );

      if (saveResult.success) {
        loadTabs();
      }
    }

    // User feedback
    if (added && skipped && invalid) {
      showMessage(
        `${added} saved, ${skipped} duplicates skipped, ${invalid} invalid tabs ignored.`,
        "info",
        4000
      );
    } else if (added && skipped) {
      showMessage(
        `${added} tab(s) saved, ${skipped} duplicate(s) skipped.`,
        "info"
      );
    } else if (added) {
      showMessage(`All ${added} tabs saved!`, "success");
    } else if (skipped && !invalid) {
      showMessage("All tabs are already saved!", "warning");
    } else if (invalid) {
      showMessage(`${invalid} invalid tabs could not be saved.`, "warning");
    }
  } catch (error) {
    console.error("Error saving all tabs:", error);
    showMessage("Failed to save tabs. Please try again.", "warning");
  }
};

// ======= Open All Tabs =======
openAllBtn.onclick = async () => {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading tabs to open"
    );

    if (!result.success) return;

    const { savedTabs = [] } = result.data;

    if (savedTabs.length === 0) {
      showMessage("No saved tabs to open", "warning");
      return;
    }

    if (savedTabs.length > 20) {
      const confirmed = confirm(
        `This will open ${savedTabs.length} tabs. Continue?`
      );
      if (!confirmed) return;
    }

    let opened = 0,
      failed = 0;

    for (const tab of savedTabs) {
      try {
        if (isValidUrl(tab.url)) {
          await chrome.tabs.create({ url: tab.url });
          opened++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error("Error opening tab:", tab.url, error);
        failed++;
      }
    }

    if (failed > 0) {
      showMessage(
        `${opened} tabs opened, ${failed} failed to open.`,
        "warning",
        4000
      );
    } else {
      showMessage(`All ${opened} tabs opened successfully!`, "success");
    }
  } catch (error) {
    console.error("Error opening all tabs:", error);
    showMessage("Failed to open tabs. Please try again.", "warning");
  }
};

// ======= Clear All Tabs =======
clearBtn.onclick = async () => {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading tabs count"
    );

    if (!result.success) return;

    const { savedTabs = [] } = result.data;
    const count = savedTabs.length;

    if (count === 0) {
      showMessage("No saved tabs to clear", "info");
      return;
    }

    const confirmed = confirm(
      `Delete all ${count} saved tabs? This cannot be undone.`
    );
    if (!confirmed) return;

    const deleteResult = await safeStorageOperation(
      () => chrome.storage.local.remove("savedTabs"),
      "clearing all tabs"
    );

    if (deleteResult.success) {
      loadTabs();
      showMessage(`All ${count} saved tabs deleted!`, "success");
    }
  } catch (error) {
    console.error("Error clearing all tabs:", error);
    showMessage("Failed to clear tabs. Please try again.", "warning");
  }
};

// ======= Export Tabs =======
exportBtn.onclick = async (e) => {
  e.preventDefault();
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading tabs for export"
    );

    if (!result.success) return;

    const { savedTabs = [] } = result.data;

    if (savedTabs.length === 0) {
      showMessage("No saved tabs to export", "warning");
      return;
    }

    const validTabs = savedTabs.filter(isValidTab);

    const exportText = validTabs
      .map((t) => `${t.title}\n${t.url}`)
      .join("\n\n");
    const blob = new Blob([exportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `tab-saver-export-${timestamp}.txt`;

    await chrome.downloads.download({ url, filename });

    // Clean up blob URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showMessage(`${validTabs.length} tabs exported successfully!`, "success");
  } catch (error) {
    console.error("Error exporting tabs:", error);
    showMessage("Failed to export tabs. Please try again.", "warning");
  }
};

// ======= Import Tabs =======
importBtn.onclick = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt";
  input.onchange = async () => {
    try {
      const file = input.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        showMessage("File too large. Maximum size is 10MB.", "warning");
        return;
      }

      showMessage("Importing tabs...", "info");

      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        showMessage("File is empty or contains no valid data", "warning");
        return;
      }

      const tabs = [];
      let invalid = 0;

      for (let i = 0; i < lines.length; i += 2) {
        const title = lines[i];
        const url = i + 1 < lines.length ? lines[i + 1] : null;

        if (!title || !url) {
          invalid++;
          continue;
        }

        const tabData = sanitizeTabData({ title, url });
        if (tabData) {
          tabs.push(tabData);
        } else {
          invalid++;
        }
      }

      if (tabs.length === 0) {
        showMessage("No valid tabs found in the file", "warning");
        return;
      }

      const result = await safeStorageOperation(
        () => chrome.storage.local.get(["savedTabs"]),
        "loading existing tabs for import"
      );

      if (!result.success) return;

      const { savedTabs = [] } = result.data;

      // Check for duplicates and limits
      const newTabs = tabs.filter(
        (t) => !savedTabs.find((st) => st.url === t.url)
      );
      const finalTabs = [...savedTabs, ...newTabs];

      if (finalTabs.length > MAX_SAVED_TABS) {
        const canImport = MAX_SAVED_TABS - savedTabs.length;
        if (canImport <= 0) {
          showMessage(
            `Cannot import: storage limit reached (${MAX_SAVED_TABS} tabs)`,
            "warning"
          );
          return;
        }
        showMessage(
          `Only importing ${canImport} tabs due to storage limit`,
          "warning",
          4000
        );
        finalTabs.splice(MAX_SAVED_TABS);
      }

      const saveResult = await safeStorageOperation(
        () => chrome.storage.local.set({ savedTabs: finalTabs }),
        "saving imported tabs"
      );

      if (saveResult.success) {
        loadTabs();
        const imported = finalTabs.length - savedTabs.length;
        const duplicates = tabs.length - newTabs.length;

        let message = `${imported} tabs imported successfully!`;
        if (duplicates > 0) message += ` ${duplicates} duplicates skipped.`;
        if (invalid > 0) message += ` ${invalid} invalid entries ignored.`;

        showMessage(message, "success", 4000);
      }
    } catch (error) {
      console.error("Error importing tabs:", error);
      showMessage(
        "Failed to import tabs. Please check the file format.",
        "warning"
      );
    }
  };
  input.click();
};

// ======= Search =======
searchInput.oninput = async () => {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading tabs for search"
    );

    if (!result.success) {
      renderTabs([]);
      return;
    }

    const { savedTabs = [] } = result.data;
    const q = searchInput.value.toLowerCase().trim();

    if (q === "") {
      renderTabs(savedTabs);
      return;
    }

    const filtered = savedTabs.filter((t) => {
      const titleMatch = t.title && t.title.toLowerCase().includes(q);
      const urlMatch = t.url && t.url.toLowerCase().includes(q);
      return titleMatch || urlMatch;
    });

    renderTabs(filtered);

    // Show search result count
    if (q && filtered.length !== savedTabs.length) {
      const message =
        filtered.length === 0
          ? "No tabs found matching your search"
          : `Found ${filtered.length} of ${savedTabs.length} tabs`;
      if (window.searchMessageTimeout)
        clearTimeout(window.searchMessageTimeout);
      window.searchMessageTimeout = setTimeout(() => {
        showMessage(message, "info", 2000);
      }, 200);
    }
  } catch (error) {
    console.error("Error searching tabs:", error);
    showMessage("Search failed. Please try again.", "warning");
    renderTabs([]);
  }
};

// ======= Settings =======
function openSettings() {
  settingsModal.showModal();
}
function closeSettings() {
  settingsModal.close();
}
settingsBtn.onclick = openSettings;
closeSettingsBtn.onclick = closeSettings;
saveSettingsBtn.onclick = async () => {
  try {
    const theme = themeSelect.value;
    const font = fontSelect.value;

    // Validate settings
    const validThemes = ["dark", "light", "blue"];
    const validFonts = ["12px", "14px", "16px"];

    if (!validThemes.includes(theme) || !validFonts.includes(font)) {
      showMessage("Invalid settings values", "warning");
      return;
    }

    const result = await safeStorageOperation(
      () => chrome.storage.local.set({ theme, font }),
      "saving settings"
    );

    if (result.success) {
      closeSettings();
      loadTabs();
      showMessage("Settings saved!", "success");
    }
  } catch (error) {
    console.error("Error saving settings:", error);
    showMessage("Failed to save settings. Please try again.", "warning");
  }
};

// ======= Initial Load =======
document.addEventListener("DOMContentLoaded", () => {
  if (!validateDOMElements()) {
    console.error(
      "Critical DOM elements missing. Extension may not work properly."
    );
    return;
  }
  loadTabs();
});

// ======= GOOGLE SIGN-IN & DRIVE SYNC (chrome.identity) =======
const CLIENT_ID =
  "623086085237-ujfrhp5rvkg2j38h7s2hgu94944qg361.apps.googleusercontent.com";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

let userEmail = null;
let accessToken = null;

// Google Sign-In
googleSignInBtn.onclick = async () => {
  try {
    showMessage("Signing in...", "info");

    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      try {
        if (chrome.runtime.lastError) {
          throw new Error(
            chrome.runtime.lastError.message || "Authentication failed"
          );
        }

        if (!token) {
          throw new Error("No authentication token received");
        }

        accessToken = token;

        // Get user email with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const resp = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: { Authorization: "Bearer " + accessToken },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error(
            `Failed to get user info: ${resp.status} ${resp.statusText}`
          );
        }

        const data = await resp.json();

        if (!data.email) {
          throw new Error("No email found in user info");
        }

        userEmail = data.email;
        googleUserInfo.style.display = "block";
        googleUserInfo.textContent = `Signed in as: ${userEmail}`;
        googleSignInBtn.style.display = "none";
        googleSignOutBtn.style.display = "inline-block";
        showMessage("Signed in successfully!", "success");
      } catch (error) {
        console.error("Error during sign-in process:", error);

        // Clean up on error
        accessToken = null;
        userEmail = null;

        if (error.name === "AbortError") {
          showMessage("Sign-in timed out. Please try again.", "warning");
        } else if (error.message.includes("User denied")) {
          showMessage("Sign-in was cancelled", "info");
        } else {
          showMessage("Sign-in failed. Please try again.", "warning");
        }
      }
    });
  } catch (error) {
    console.error("Error initiating sign-in:", error);
    showMessage("Failed to initiate sign-in", "warning");
  }
};

googleSignOutBtn.onclick = () => {
  chrome.identity.getAuthToken({ interactive: false }, function (token) {
    if (token) {
      chrome.identity.removeCachedAuthToken({ token: token }, function () {
        accessToken = null;
        userEmail = null;
        googleUserInfo.style.display = "none";
        googleSignInBtn.style.display = "inline-block";
        googleSignOutBtn.style.display = "none";
        showMessage("Signed out!", "success");
      });
    }
  });
};

// Sync to Google Drive
syncToDriveBtn.onclick = async () => {
  try {
    if (!accessToken) {
      showMessage("Please sign in with Google first!", "warning");
      return;
    }

    showMessage("Syncing to Google Drive...", "info");

    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading tabs for sync"
    );

    if (!result.success) return;

    const { savedTabs = [] } = result.data;
    const validTabs = savedTabs.filter(isValidTab);

    if (validTabs.length === 0) {
      showMessage("No valid tabs to sync", "warning");
      return;
    }

    const fileContent = JSON.stringify(validTabs);

    // Check file size (Drive has limits)
    if (fileContent.length > 5 * 1024 * 1024) {
      // 5MB limit
      showMessage("Data too large for Google Drive sync", "warning");
      return;
    }

    // Check if file exists
    const listResp = await fetch(
      `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name='tabsaverpro.json'&fields=files(id,name)`,
      {
        headers: { Authorization: "Bearer " + accessToken },
      }
    );

    if (!listResp.ok) {
      throw new Error(
        `Failed to list files: ${listResp.status} ${listResp.statusText}`
      );
    }

    const listData = await listResp.json();
    let fileId = null;
    if (listData.files && listData.files.length > 0) {
      fileId = listData.files[0].id;
    }

    const metadata = {
      name: "tabsaverpro.json",
      parents: ["appDataFolder"],
    };

    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      fileContent +
      close_delim;

    let method = fileId ? "PATCH" : "POST";
    let url = fileId
      ? `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=multipart`
      : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;

    const uploadResp = await fetch(url, {
      method: method,
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": 'multipart/related; boundary="' + boundary + '"',
      },
      body: multipartRequestBody,
    });

    if (!uploadResp.ok) {
      const errorText = await uploadResp.text();
      throw new Error(
        `Upload failed: ${uploadResp.status} ${uploadResp.statusText} - ${errorText}`
      );
    }

    showMessage(`${validTabs.length} tabs synced to Google Drive!`, "success");
  } catch (error) {
    console.error("Error syncing to Google Drive:", error);

    if (error.message.includes("401")) {
      showMessage("Authentication expired. Please sign in again.", "warning");
      // Clear invalid token
      accessToken = null;
      userEmail = null;
      googleUserInfo.style.display = "none";
      googleSignInBtn.style.display = "inline-block";
      googleSignOutBtn.style.display = "none";
    } else if (error.message.includes("403")) {
      showMessage(
        "Access denied. Check your Google Drive permissions.",
        "warning"
      );
    } else if (error.message.includes("Network")) {
      showMessage(
        "Network error. Please check your connection and try again.",
        "warning"
      );
    } else {
      showMessage(
        "Failed to sync to Google Drive. Please try again.",
        "warning"
      );
    }
  }
};

// Restore from Google Drive
restoreFromDriveBtn.onclick = async () => {
  try {
    if (!accessToken) {
      showMessage("Please sign in with Google first!", "warning");
      return;
    }

    showMessage("Restoring from Google Drive...", "info");

    const listResp = await fetch(
      `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name='tabsaverpro.json'&fields=files(id,name)`,
      {
        headers: { Authorization: "Bearer " + accessToken },
      }
    );

    if (!listResp.ok) {
      throw new Error(
        `Failed to list files: ${listResp.status} ${listResp.statusText}`
      );
    }

    const listData = await listResp.json();
    if (!listData.files || listData.files.length === 0) {
      showMessage("No backup found in Google Drive!", "warning");
      return;
    }

    const fileId = listData.files[0].id;
    const fileResp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: "Bearer " + accessToken },
      }
    );

    if (!fileResp.ok) {
      throw new Error(
        `Failed to download file: ${fileResp.status} ${fileResp.statusText}`
      );
    }

    const responseText = await fileResp.text();
    let tabs;

    try {
      tabs = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error("Invalid backup file format");
    }

    if (!Array.isArray(tabs)) {
      throw new Error("Backup file contains invalid data structure");
    }

    // Validate and clean restored tabs
    const validTabs = tabs.filter((tab) => {
      return isValidTab(tab);
    });

    if (validTabs.length === 0) {
      showMessage("No valid tabs found in backup", "warning");
      return;
    }

    // Ask user for confirmation if there are existing tabs
    const currentResult = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "checking existing tabs"
    );

    if (!currentResult.success) return;

    const { savedTabs: currentTabs = [] } = currentResult.data;

    if (currentTabs.length > 0) {
      const confirmed = confirm(
        `This will replace your ${currentTabs.length} current tabs with ${validTabs.length} tabs from backup. Continue?`
      );
      if (!confirmed) return;
    }

    const saveResult = await safeStorageOperation(
      () => chrome.storage.local.set({ savedTabs: validTabs }),
      "restoring tabs from backup"
    );

    if (saveResult.success) {
      loadTabs();
      let message = `${validTabs.length} tabs restored from Google Drive!`;
      if (validTabs.length !== tabs.length) {
        message += ` (${
          tabs.length - validTabs.length
        } invalid entries were skipped)`;
      }
      showMessage(message, "success", 4000);
    }
  } catch (error) {
    console.error("Error restoring from Google Drive:", error);

    if (error.message.includes("401")) {
      showMessage("Authentication expired. Please sign in again.", "warning");
      // Clear invalid token
      accessToken = null;
      userEmail = null;
      googleUserInfo.style.display = "none";
      googleSignInBtn.style.display = "inline-block";
      googleSignOutBtn.style.display = "none";
    } else if (error.message.includes("403")) {
      showMessage(
        "Access denied. Check your Google Drive permissions.",
        "warning"
      );
    } else if (error.message.includes("Network")) {
      showMessage(
        "Network error. Please check your connection and try again.",
        "warning"
      );
    } else if (error.message.includes("Invalid backup")) {
      showMessage("Backup file is corrupted or invalid", "warning");
    } else {
      showMessage(
        "Failed to restore from Google Drive. Please try again.",
        "warning"
      );
    }
  }
};
