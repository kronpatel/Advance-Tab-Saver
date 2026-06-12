// ======= Extension Environment Mock for Preview/Standalone mode =======
if (typeof chrome === "undefined" || !chrome.runtime) {
  console.log("Running in standalone preview mode. Mocking chrome APIs using localStorage.");
  window.chrome = {
    runtime: {
      lastError: null,
      sendMessage: (msg, callback) => {
        console.log("Mock sendMessage:", msg);
        if (msg.action === "openTabs") {
          msg.tabs.forEach(t => window.open(t.url, "_blank"));
          const resp = { success: true, successCount: msg.tabs.length, failCount: 0 };
          if (callback) callback(resp);
          return Promise.resolve(resp);
        }
        const resp = { success: true };
        if (callback) callback(resp);
        return Promise.resolve(resp);
      }
    },
    storage: {
      local: {
        get: (keys) => {
          const res = {};
          const arrayKeys = Array.isArray(keys) ? keys : [keys];
          arrayKeys.forEach(k => {
            try {
              const val = localStorage.getItem(k);
              res[k] = val ? JSON.parse(val) : undefined;
            } catch (e) {
              res[k] = undefined;
            }
          });
          return Promise.resolve(res);
        },
        set: (obj) => {
          Object.entries(obj).forEach(([k, v]) => {
            localStorage.setItem(k, JSON.stringify(v));
          });
          return Promise.resolve();
        },
        remove: (keys) => {
          const arrayKeys = Array.isArray(keys) ? keys : [keys];
          arrayKeys.forEach(k => localStorage.removeItem(k));
          return Promise.resolve();
        },
        getBytesInUse: (keys, callback) => {
          let totalBytes = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            if (key && val) {
              totalBytes += (key.length + val.length) * 2;
            }
          }
          if (callback) callback(totalBytes);
          return Promise.resolve(totalBytes);
        }
      }
    },
    tabs: {
      query: (queryInfo, callback) => {
        const mockTabs = [
          { title: "Google", url: "https://www.google.com", favIconUrl: "https://www.google.com/favicon.ico", id: 1 },
          { title: "GitHub", url: "https://github.com", favIconUrl: "https://github.com/favicon.ico", id: 2 },
          { title: "ChatGPT", url: "https://chatgpt.com", favIconUrl: "https://www.google.com/s2/favicons?domain=chatgpt.com", id: 3 }
        ];
        if (callback) callback(mockTabs);
        return Promise.resolve(mockTabs);
      },
      create: (createProperties) => {
        console.log("Mock create tab:", createProperties);
        window.open(createProperties.url, "_blank");
        return Promise.resolve({ id: Math.random() });
      }
    },
    downloads: {
      download: (options, callback) => {
        console.log("Mock download:", options);
        const a = document.createElement("a");
        a.href = options.url;
        a.download = options.filename || "download";
        a.click();
        if (callback) callback(12345);
        return Promise.resolve(12345);
      }
    }
  };
}

// ======= Constants =======
const DEFAULT_FAVICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ddd"/></svg>';
const MAX_SAVED_TABS = 1000;

// ======= Utility Functions =======
function escapeHTML(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

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

// ======= Productivity State =======
let selectedTabUrls = [];

// Bulk Selection UI elements
const bulkControls = document.getElementById("bulkControls");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
const selectAllLabel = document.getElementById("selectAllLabel");
const selectedCountText = document.getElementById("selectedCountText");
const bulkOpenBtn = document.getElementById("bulkOpenBtn");
const bulkExportBtn = document.getElementById("bulkExportBtn");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");

// Storage dashboard cards
const statsTotal = document.getElementById("statsTotal");
const statsFavorites = document.getElementById("statsFavorites");
const statsSessions = document.getElementById("statsSessions");
const statsStorage = document.getElementById("statsStorage");

// Duplicate detector
const duplicateCountSpan = document.getElementById("duplicateCountSpan");
const scanDuplicatesBtn = document.getElementById("scanDuplicatesBtn");
const removeDuplicatesBtn = document.getElementById("removeDuplicatesBtn");
const duplicateCleanResult = document.getElementById("duplicateCleanResult");

// Save All Mode and Session Category selectors (rehydrated on DOMContentLoaded)
let saveAllModeModal = null;
let saveAllCountMessage = null;
let cancelSaveAllModeBtn = null;
let continueSaveAllModeBtn = null;
let sessionCategorySelect = null;
let sessionCustomCategoryInput = null;
// Theme toggle
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeToggleIcon = document.getElementById("themeToggleIcon");
// Category controls
const categorySelect = document.getElementById("categorySelect");
const customCategoryInput = document.getElementById("customCategoryInput");
// Save Session Modal Elements (rehydrated on DOMContentLoaded)
let sessionNameInput = document.querySelector("#sessionNameInput") || null;
let saveSessionModal = document.querySelector("#saveSessionModal") || null;
let confirmSaveBtn = document.querySelector("#confirmSaveBtn") || null;
let cancelSaveBtn = document.querySelector("#cancelSaveBtn") || null;
let sessionNameError = document.querySelector("#sessionNameError") || null;



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

  let favicon = tab.favicon || tab.favIconUrl;
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
    savedAt: tab.savedAt || Date.now(),
    category: tab.category ? String(tab.category).slice(0, 100) : undefined,
    favorite: tab.favorite === true
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
  actionsTab.setAttribute("aria-selected", "true");
  statsTab.classList.remove("ag-tab-btn-active");
  statsTab.setAttribute("aria-selected", "false");
  actionsContent.style.display = "";
  statsContent.style.display = "none";
};
statsTab.onclick = async () => {
  statsTab.classList.add("ag-tab-btn-active");
  statsTab.setAttribute("aria-selected", "true");
  actionsTab.classList.remove("ag-tab-btn-active");
  actionsTab.setAttribute("aria-selected", "false");
  actionsContent.style.display = "none";
  statsContent.style.display = "";

  // Update dashboard and reset duplicate search state
  await updateDashboardMetrics();
  if (duplicateCountSpan) {
    duplicateCountSpan.textContent = "Unscanned";
  }
  if (removeDuplicatesBtn) {
    removeDuplicatesBtn.disabled = true;
  }
  if (duplicateCleanResult) {
    duplicateCleanResult.style.display = "none";
  }
};

// ======= Render Tabs =======
function renderTabs(tabs, totalSavedCount = null) {
  try {
    tabList.innerHTML = "";

    if (!Array.isArray(tabs)) {
      tabs = [];
    }

    const validTabs = tabs.filter(isValidTab);

    // Filter selectedTabUrls to only keep ones that exist in validTabs
    const allValidUrls = validTabs.map((t) => t.url);
    selectedTabUrls = selectedTabUrls.filter((url) => allValidUrls.includes(url));

    // Show empty state if no tabs
    if (validTabs.length === 0) {
      tabList.innerHTML = `
        <div class="empty-state">
          <span class="material-icons empty-state-icon">folder_open</span>
          <h4 class="empty-state-title">No saved tabs yet</h4>
          <p class="empty-state-desc">Save your first tab using the quick actions above to get started.</p>
        </div>
      `;
      tabCount.textContent = "0";
      const totalCount = totalSavedCount !== null ? totalSavedCount : 0;
      if (totalTabs) totalTabs.textContent = `Total saved: ${totalCount}`;
      
      // Update bulk controls
      updateBulkControlsUI();
      return;
    }

    // Separate favorites and normal tabs
    const favorites = validTabs.filter(t => t.favorite);
    const normals = validTabs.filter(t => !t.favorite);

    const grouped = {};
    normals.forEach((tab) => {
      try {
        const date = new Date(tab.savedAt).toLocaleDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(tab);
      } catch (error) {
        // Skip invalid date
      }
    });

    // Helper to create tab DOM node
    function createTabElement(tab) {
      const div = document.createElement("div");
      div.className = "tab";

      // Checkbox for bulk select
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "tab-checkbox";
      checkbox.dataset.url = tab.url;
      checkbox.checked = selectedTabUrls.includes(tab.url);

      const img = document.createElement("img");
      img.className = "favicon";
      img.src = tab.favicon || DEFAULT_FAVICON;
      img.onerror = () => {
        img.onerror = null;
        img.src = DEFAULT_FAVICON;
      };

      const titleContainer = document.createElement("div");
      titleContainer.className = "tab-title-container";

      const titleRow = document.createElement("div");
      titleRow.className = "tab-title-row";

      const titleSpan = document.createElement("span");
      titleSpan.className = "tab-title";
      titleSpan.title = tab.title || "Untitled";
      titleSpan.textContent = tab.title || "Untitled";
      titleRow.appendChild(titleSpan);

      if (tab.category) {
        const badge = document.createElement("span");
        badge.className = `category-badge badge-${tab.category.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        badge.textContent = tab.category;
        titleRow.appendChild(badge);
      }

      const urlSpan = document.createElement("span");
      urlSpan.className = "tab-url";
      urlSpan.title = tab.url;
      urlSpan.textContent = tab.url;

      titleContainer.appendChild(titleRow);
      titleContainer.appendChild(urlSpan);

      // Star / Favorite button
      const starBtn = document.createElement("button");
      starBtn.dataset.url = tab.url;
      starBtn.className = "star-btn" + (tab.favorite ? " active" : "");
      starBtn.title = tab.favorite ? "Remove from Favorites" : "Add to Favorites";
      starBtn.innerHTML = `<span class="material-icons">${tab.favorite ? "star" : "star_border"}</span>`;

      const openBtn = document.createElement("button");
      openBtn.dataset.url = tab.url;
      openBtn.className = "open";
      openBtn.title = "Open";
      openBtn.innerHTML = '<span class="material-icons">open_in_new</span>';

      const deleteBtn = document.createElement("button");
      deleteBtn.dataset.url = tab.url;
      deleteBtn.className = "delete";
      deleteBtn.title = "Delete";
      deleteBtn.innerHTML = '<span class="material-icons">delete</span>';

      div.appendChild(checkbox);
      div.appendChild(img);
      div.appendChild(titleContainer);
      div.appendChild(starBtn);
      div.appendChild(openBtn);
      div.appendChild(deleteBtn);

      return div;
    }

    // Render Favorites Group at the top
    if (favorites.length > 0) {
      const group = document.createElement("div");
      group.className = "tab-group favorites-group";
      const header = document.createElement("h4");
      header.innerHTML = '<span class="material-icons" style="font-size: 14px; color: #ffc107; vertical-align: middle; margin-right: 4px;">star</span>Favorite Tabs';
      group.appendChild(header);

      favorites.forEach((tab) => {
        try {
          const tabDiv = createTabElement(tab);
          group.appendChild(tabDiv);
        } catch (e) {
          console.error("Error rendering favorite tab", e);
        }
      });
      tabList.appendChild(group);
    }

    // Render Normal Groups (by Date)
    for (const date in grouped) {
      try {
        const group = document.createElement("div");
        group.className = "tab-group";
        const header = document.createElement("h4");
        header.textContent = date;
        group.appendChild(header);

        grouped[date].forEach((tab) => {
          try {
            const tabDiv = createTabElement(tab);
            group.appendChild(tabDiv);
          } catch (e) {
            console.error("Error rendering normal tab", e);
          }
        });

        tabList.appendChild(group);
      } catch (error) {
        console.error("Error rendering date group", error);
      }
    }

    tabCount.textContent = validTabs.length;
    const totalCount = totalSavedCount !== null ? totalSavedCount : validTabs.length;
    if (totalTabs) totalTabs.textContent = `Total saved: ${totalCount}`;

    // Update Bulk Controls panel
    updateBulkControlsUI();
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

    // Apply theme and font settings
    applySettings(theme, font);
    updateThemeToggleIcon(theme);

    // Validate and clean data
    await validateStorageData();
    await refreshTabsList();
    
    // Update dashboard metrics
    updateDashboardMetrics();
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
      try {
        await chrome.tabs.create({ url });
        if (chrome.runtime.lastError) {
          console.warn("Tab likely closed before action:", chrome.runtime.lastError.message);
          showMessage("Failed to open tab. It may have been closed.", "warning");
          return;
        }
        showMessage("Tab opened!", "success");
      } catch (error) {
        console.error("Error opening tab:", error);
        showMessage("Failed to open tab. Please try again.", "warning");
      }
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
        updateDashboardMetrics();
        showMessage("Tab deleted!", "success");
      }
    } else if (e.target.closest(".star-btn")) {
      const url = e.target.closest(".star-btn").dataset.url;
      const result = await safeStorageOperation(
        () => chrome.storage.local.get(["savedTabs"]),
        "loading tabs for favorite toggle"
      );

      if (!result.success) return;

      const { savedTabs = [] } = result.data;
      const updated = savedTabs.map((t) => {
        if (t.url === url) {
          return { ...t, favorite: !t.favorite };
        }
        return t;
      });

      const saveResult = await safeStorageOperation(
        () => chrome.storage.local.set({ savedTabs: updated }),
        "toggling favorite status"
      );

      if (saveResult.success) {
        await refreshTabsList();
        updateDashboardMetrics();
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
    if (chrome.runtime.lastError) {
      console.warn("Tab query error:", chrome.runtime.lastError.message);
      showMessage("Failed to access current tab. Please try again.", "warning");
      return;
    }
    if (!tab) {
      showMessage("No active tab found", "warning");
      return;
    }

    // Determine category selection
    let selectedCategory = undefined;
    try {
      if (categorySelect) {
        if (categorySelect.value === "Custom") {
          const customVal = (customCategoryInput?.value || "").trim();
          if (customVal.length > 0) selectedCategory = customVal;
        } else {
          selectedCategory = categorySelect.value;
        }
      }
    } catch (e) {}

    const sanitizedTab = sanitizeTabData({ ...tab, category: selectedCategory });
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

// ======= Save All Tabs Mode Selection =======
saveAllBtn.addEventListener("click", async () => {
  if (!saveAllModeModal || !saveAllCountMessage) {
    console.error("⚠️ Save All Mode selector modal missing.");
    return;
  }

  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.warn("Tab query error:", chrome.runtime.lastError.message);
      showMessage("Failed to retrieve open tabs.", "warning");
      return;
    }
    const count = (tabs || []).length;
    saveAllCountMessage.textContent = `You currently have ${count} open tabs. Choose how you want to save them.`;

    // Select "individual" by default
    const firstRadio = saveAllModeModal.querySelector('input[name="saveAllMode"][value="individual"]');
    if (firstRadio) firstRadio.checked = true;

    saveAllModeModal.classList.remove("hidden");
  });
});

function setupSaveAllModeModalHandlers() {
  if (!saveAllModeModal) return;

  if (cancelSaveAllModeBtn && !cancelSaveAllModeBtn.dataset.bound) {
    cancelSaveAllModeBtn.addEventListener("click", () => {
      saveAllModeModal.classList.add("hidden");
    });
    cancelSaveAllModeBtn.dataset.bound = "true";
  }

  // Backdrop click to close
  if (!saveAllModeModal.dataset.boundBackdrop) {
    saveAllModeModal.addEventListener("click", (e) => {
      if (e.target === saveAllModeModal) {
        saveAllModeModal.classList.add("hidden");
      }
    });
    saveAllModeModal.dataset.boundBackdrop = "true";
  }

  if (continueSaveAllModeBtn && !continueSaveAllModeBtn.dataset.bound) {
    continueSaveAllModeBtn.addEventListener("click", async () => {
      const selectedModeRadio = saveAllModeModal.querySelector('input[name="saveAllMode"]:checked');
      const mode = selectedModeRadio ? selectedModeRadio.value : "individual";

      saveAllModeModal.classList.add("hidden");

      if (mode === "individual") {
        await saveAllAsIndividualTabs();
      } else if (mode === "session") {
        openSaveSessionModal();
      }
    });
    continueSaveAllModeBtn.dataset.bound = "true";
  }
}

async function saveAllAsIndividualTabs() {
  try {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn("Tab query error:", chrome.runtime.lastError.message);
        showMessage("Failed to retrieve open tabs.", "warning");
        return;
      }
      
      if (!tabs || tabs.length === 0) {
        showMessage("No tabs to save.", "warning");
        return;
      }

      // Fetch active category from quick actions
      let selectedCategory = undefined;
      try {
        if (categorySelect) {
          if (categorySelect.value === "Custom") {
            const customVal = (customCategoryInput?.value || "").trim();
            if (customVal.length > 0) selectedCategory = customVal;
          } else {
            selectedCategory = categorySelect.value;
          }
        }
      } catch (e) {}

      // Sanitize open tabs using the fetched category
      const sanitizedTabs = [];
      tabs.forEach((tab) => {
        const sanitized = sanitizeTabData({ ...tab, category: selectedCategory });
        if (sanitized) {
          sanitizedTabs.push(sanitized);
        }
      });

      if (sanitizedTabs.length === 0) {
        showMessage("No valid tabs found to save.", "warning");
        return;
      }

      // Retrieve existing tabs from storage to avoid duplicate tabs
      const result = await safeStorageOperation(
        () => chrome.storage.local.get(["savedTabs"]),
        "loading saved tabs for save all"
      );
      if (!result.success) return;

      const { savedTabs = [] } = result.data;
      let addedCount = 0;
      const finalTabs = [...savedTabs];

      for (const tab of sanitizedTabs) {
        // Prevent duplicate tab save: check if URL already exists
        if (!finalTabs.find((t) => t.url === tab.url)) {
          finalTabs.push(tab);
          addedCount++;
        }
      }

      if (addedCount === 0) {
        showMessage("All open tabs are already saved!", "warning");
        return;
      }

      if (finalTabs.length > MAX_SAVED_TABS) {
        const canSave = MAX_SAVED_TABS - savedTabs.length;
        if (canSave <= 0) {
          showMessage(`Cannot save tabs: storage limit reached (${MAX_SAVED_TABS} tabs)`, "warning");
          return;
        }
        showMessage(`Only saving ${canSave} tabs due to storage limit`, "warning", 4000);
        finalTabs.splice(MAX_SAVED_TABS);
        addedCount = finalTabs.length - savedTabs.length;
      }

      const saveResult = await safeStorageOperation(
        () => chrome.storage.local.set({ savedTabs: finalTabs }),
        "saving all tabs individually"
      );

      if (saveResult.success) {
        await refreshTabsList();
        updateDashboardMetrics();
        showMessage(`Saved ${addedCount} tabs successfully.`, "success");
      }
    });
  } catch (error) {
    console.error("Error saving all tabs individually:", error);
    showMessage("Failed to save all tabs.", "warning");
  }
}

function openSaveSessionModal() {
  if (!sessionNameInput || !saveSessionModal || !confirmSaveBtn) {
    console.error("⚠️ Save modal missing — UI not linked correctly.");
    return;
  }
  const now = new Date();
  sessionNameInput.value = `Session - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

  // Reset category selectors inside session modal
  if (sessionCategorySelect) {
    sessionCategorySelect.value = "Work";
    if (sessionCustomCategoryInput) {
      sessionCustomCategoryInput.value = "";
      sessionCustomCategoryInput.classList.add("hidden");
    }
  }

  confirmSaveBtn.disabled = false;
  sessionNameError && sessionNameError.classList.add("hidden");
  saveSessionModal.classList.remove("hidden");
}

// Attach/rehydrate modal handlers (idempotent)
function setupSaveSessionModalHandlers() {
  if (!saveSessionModal) return;

  if (cancelSaveBtn && !cancelSaveBtn.dataset.bound) {
    cancelSaveBtn.addEventListener("click", () => {
      saveSessionModal.classList.add("hidden");
    });
    cancelSaveBtn.dataset.bound = "true";
  }

  if (sessionCategorySelect && !sessionCategorySelect.dataset.boundSelect) {
    const syncSessionCategoryUI = () => {
      if (sessionCategorySelect.value === "Custom") {
        sessionCustomCategoryInput?.classList.remove("hidden");
        sessionCustomCategoryInput?.focus();
      } else {
        sessionCustomCategoryInput?.classList.add("hidden");
      }
    };
    sessionCategorySelect.addEventListener("change", syncSessionCategoryUI);
    sessionCategorySelect.dataset.boundSelect = "true";
  }

  if (sessionNameInput && !sessionNameInput.dataset.boundInput) {
    sessionNameInput.addEventListener("input", () => {
      if (!confirmSaveBtn || !sessionNameError) return;
      if (sessionNameInput.value.trim().length === 0) {
        confirmSaveBtn.disabled = true;
        sessionNameError.classList.remove("hidden");
      } else {
        confirmSaveBtn.disabled = false;
        sessionNameError.classList.add("hidden");
      }
    });
    // Enter to save
    sessionNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && confirmSaveBtn && !confirmSaveBtn.disabled) {
        confirmSaveBtn.click();
      }
    });
    sessionNameInput.dataset.boundInput = "true";
  }

  // backdrop click to close
  if (!saveSessionModal.dataset.boundBackdrop) {
    saveSessionModal.addEventListener("click", (e) => {
      if (e.target === saveSessionModal) {
        saveSessionModal.classList.add("hidden");
      }
    });
    saveSessionModal.dataset.boundBackdrop = "true";
  }

  if (confirmSaveBtn && !confirmSaveBtn.dataset.boundConfirm) {
    confirmSaveBtn.addEventListener("click", async () => {
      const name = (sessionNameInput?.value || "").trim();
      if (!name) return;

      chrome.tabs.query({ currentWindow: true }, async (tabs) => {
        if (chrome.runtime.lastError) {
          console.warn("Tab query error:", chrome.runtime.lastError.message);
          showMessage("Failed to access tabs. Please try again.", "warning");
          return;
        }

        let selectedCategory = undefined;
        try {
          if (sessionCategorySelect) {
            if (sessionCategorySelect.value === "Custom") {
              const customVal = (sessionCustomCategoryInput?.value || "").trim();
              if (customVal.length > 0) selectedCategory = customVal;
            } else {
              selectedCategory = sessionCategorySelect.value;
            }
          }
        } catch (e) {}

        const session = {
          id: Date.now(),
          name,
          category: selectedCategory,
          tabs,
          createdAt: new Date().toISOString(),
        };

        try {
          const result = await safeStorageOperation(
            () => chrome.storage.local.get("savedSessions"),
            "loading sessions"
          );
          
          if (!result.success) return;

          const { savedSessions = [] } = result.data;
          savedSessions.push(session);
          
          const saveResult = await safeStorageOperation(
            () => chrome.storage.local.set({ savedSessions }),
            "saving session"
          );

          if (saveResult.success) {
            saveSessionModal.classList.add("hidden");
            if (typeof loadSessions === "function") {
              try { await loadSessions(); } catch (e) {}
            }
            showMessage("Session saved!", "success");
          }
        } catch (error) {
          console.error("Error saving session:", error);
          showMessage("Failed to save session.", "warning");
        }
      });
    });
    confirmSaveBtn.dataset.boundConfirm = "true";
  }
}

// ======= Sessions UI =======
async function loadSessions() {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get("savedSessions"),
      "loading sessions"
    );

    if (!result.success) {
      const list = document.getElementById("sessionsList");
      if (list) list.innerHTML = "<p>Error loading sessions.</p>";
      return;
    }

    const { savedSessions = [] } = result.data;
    const list = document.getElementById("sessionsList");
    if (!list) return;

    list.innerHTML = "";

    if (!savedSessions || savedSessions.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="material-icons empty-state-icon">folder_off</span>
          <h4 class="empty-state-title">No sessions available</h4>
          <p class="empty-state-desc">Create your first session by saving all open tabs.</p>
        </div>
      `;
      updateDashboardMetrics();
      return;
    }

    savedSessions.forEach((session) => {
      const div = document.createElement("div");
      div.className = "session-item";

      const date = new Date(session.createdAt).toLocaleDateString();
      const tabCount = (session.tabs || []).length;

      let badgeHTML = "";
      if (session.category) {
        badgeHTML = `<span class="category-badge badge-${session.category.toLowerCase().replace(/[^a-z0-9]/g, "-")}">${escapeHTML(session.category)}</span>`;
      }

      div.innerHTML = `
        <div class="session-info">
          <div class="session-name-row">
            <span class="session-name">${escapeHTML(session.name)}</span>
            ${badgeHTML}
          </div>
          <div class="session-meta">
            <span class="session-meta-item">
              <span class="material-icons session-meta-icon">calendar_today</span>
              <span>${date}</span>
            </span>
            <span class="session-meta-divider">&bull;</span>
            <span class="session-meta-item">
              <span class="material-icons session-meta-icon">tab</span>
              <span>${tabCount} tab${tabCount > 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>
        <div class="session-actions">
          <button class="btn restore" data-id="${session.id}">
            <span class="material-icons">restore</span>
            <span>Restore</span>
          </button>
          <button class="btn delete" data-id="${session.id}">
            <span class="material-icons">delete</span>
            <span>Delete</span>
          </button>
        </div>
      `;

      list.appendChild(div);
    });

    attachSessionButtons();
    updateDashboardMetrics();
  } catch (error) {
    console.error("Error loading sessions:", error);
  }
}

function attachSessionButtons() {
  document.querySelectorAll("#sessionsList .btn.restore").forEach((btn) => {
    btn.addEventListener("click", () => restoreSession(btn.dataset.id));
  });

  document.querySelectorAll("#sessionsList .btn.delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteSession(btn.dataset.id));
  });
}

async function restoreSession(id) {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get("savedSessions"),
      "loading sessions for restore"
    );

    if (!result.success) return;

    const { savedSessions = [] } = result.data;
    const session = savedSessions.find((s) => s.id == id);
    if (session.tabs && session.tabs.length > 0) {
      showMessage(`Restoring session with ${session.tabs.length} tabs...`, "info");
      const response = await chrome.runtime.sendMessage({
        action: "openTabs",
        tabs: session.tabs,
      });

      if (response && response.success) {
        if (response.failCount === 0) {
          showMessage(`Successfully restored all ${response.successCount} tabs!`, "success");
        } else {
          showMessage(`Restored ${response.successCount} tabs, ${response.failCount} failed`, "warning");
        }
      } else {
        showMessage("Failed to restore session.", "warning");
      }
    } else {
      showMessage("No tabs in session to restore.", "warning");
    }
  } catch (error) {
    console.error("Error restoring session:", error);
    showMessage("Failed to restore session.", "warning");
  }
}

async function deleteSession(id) {
  const confirmDelete = confirm("Delete this session permanently?");
  if (!confirmDelete) return;

  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get("savedSessions"),
      "loading sessions for deletion"
    );

    if (!result.success) return;

    const { savedSessions = [] } = result.data;
    const updated = savedSessions.filter((s) => s.id != id);
    
    const saveResult = await safeStorageOperation(
      () => chrome.storage.local.set({ savedSessions: updated }),
      "deleting session"
    );

    if (saveResult.success) {
      await loadSessions();
    }
  } catch (error) {
    console.error("Error deleting session:", error);
    showMessage("Failed to delete session.", "warning");
  }
}

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

    showMessage(`Opening ${savedTabs.length} tabs...`, "info");

    // Use background script to open tabs (more reliable)
    const response = await chrome.runtime.sendMessage({
      action: "openTabs",
      tabs: savedTabs,
    });

    if (response && response.success) {
      if (response.failCount === 0) {
        showMessage(
          `Successfully opened all ${response.successCount} tabs!`,
          "success"
        );
      } else {
        showMessage(
          `Opened ${response.successCount} tabs, ${response.failCount} failed`,
          "warning"
        );
      }
    } else {
      showMessage("Failed to open tabs. Please try again.", "warning");
    }
  } catch (error) {
    console.error("Error opening tabs:", error);
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
  if (e) e.preventDefault();
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

    const jsonData = JSON.stringify(validTabs, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `tab-saver-export-${timestamp}.json`;

    await chrome.downloads.download({ url, filename }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.warn("Download error:", chrome.runtime.lastError.message);
        showMessage("Failed to export tabs. Please try again.", "warning");
        URL.revokeObjectURL(url);
        return;
      }
      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showMessage(`${validTabs.length} tabs exported successfully!`, "success");
    });
  } catch (error) {
    console.error("Error exporting tabs:", error);
    showMessage("Failed to export tabs. Please try again.", "warning");
  }
};

// ======= Import Tabs =======
importBtn.onclick = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
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
      let importedData;
      try {
        importedData = JSON.parse(text);
      } catch (e) {
        showMessage("Failed to parse JSON. Please check the file format.", "warning");
        return;
      }

      if (!Array.isArray(importedData)) {
        showMessage("Invalid backup format. Expected a JSON list of tabs.", "warning");
        return;
      }

      const tabs = [];
      let invalid = 0;

      for (const item of importedData) {
        if (!item || !item.url || !item.title) {
          invalid++;
          continue;
        }

        const tabData = sanitizeTabData(item);
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

// ======= Search & Filtering =======
async function refreshTabsList() {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading tabs for refresh"
    );

    if (!result.success) {
      renderTabs([]);
      return;
    }

    const { savedTabs = [] } = result.data;
    const q = searchInput.value.toLowerCase().trim();
    const cat = document.getElementById("categoryFilter")?.value || "All";

    const filtered = savedTabs.filter((t) => {
      const titleMatch = !q || (t.title && t.title.toLowerCase().includes(q));
      const urlMatch = !q || (t.url && t.url.toLowerCase().includes(q));
      const matchesSearch = titleMatch || urlMatch;

      let matchesCategory = true;
      if (cat !== "All") {
        if (cat === "Custom") {
          const standardCats = ["Work", "Project", "Study", "Personal"];
          matchesCategory = t.category && !standardCats.includes(t.category);
        } else {
          matchesCategory = t.category === cat;
        }
      }

      return matchesSearch && matchesCategory;
    });

    renderTabs(filtered, savedTabs.length);

    // Show search/filter result count
    if ((q || cat !== "All") && filtered.length !== savedTabs.length) {
      const message =
        filtered.length === 0
          ? "No tabs found matching your filters"
          : `Found ${filtered.length} of ${savedTabs.length} tabs`;
      if (window.searchMessageTimeout)
        clearTimeout(window.searchMessageTimeout);
      window.searchMessageTimeout = setTimeout(() => {
        showMessage(message, "info", 2000);
      }, 200);
    }
  } catch (error) {
    console.error("Error refreshing tabs list:", error);
    showMessage("Filter operation failed.", "warning");
    renderTabs([]);
  }
}

searchInput.oninput = refreshTabsList;

const categoryFilter = document.getElementById("categoryFilter");
if (categoryFilter) {
  categoryFilter.onchange = refreshTabsList;
}

// ======= Settings =======
async function openSettings() {
  settingsModal.showModal();

  // Load current settings
  try {
    const result = await safeStorageOperation(
      () =>
        chrome.storage.local.get([
          "theme",
          "font",
          "autoSaveEnabled",
          "autoSaveIdleTime",
          "autoSaveShowNotification",
        ]),
      "loading settings"
    );

    if (result.success) {
      const {
        theme = "dark",
        font = "14px",
        autoSaveEnabled = false,
        autoSaveIdleTime = 120,
        autoSaveShowNotification = true,
      } = result.data;
      themeSelect.value = theme;
      fontSelect.value = font;
      document.getElementById("autoSaveEnabled").checked = autoSaveEnabled;
      document.getElementById("autoSaveIdleTime").value = autoSaveIdleTime;
      document.getElementById("autoSaveShowNotification").checked =
        autoSaveShowNotification;
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

function closeSettings() {
  settingsModal.close();
}

settingsBtn.onclick = openSettings;
closeSettingsBtn.onclick = closeSettings;

// Close modal when clicking outside
settingsModal.addEventListener("click", (e) => {
  const dialogDimensions = settingsModal.getBoundingClientRect();
  if (
    e.clientX < dialogDimensions.left ||
    e.clientX > dialogDimensions.right ||
    e.clientY < dialogDimensions.top ||
    e.clientY > dialogDimensions.bottom
  ) {
    closeSettings();
  }
});

saveSettingsBtn.onclick = async () => {
  try {
    const theme = themeSelect.value;
    const font = fontSelect.value;
    const autoSaveEnabled = document.getElementById("autoSaveEnabled").checked;
    const autoSaveIdleTime = parseInt(document.getElementById("autoSaveIdleTime").value, 10);
    const autoSaveShowNotification = document.getElementById("autoSaveShowNotification").checked;

    // Validate settings
    const validThemes = ["dark", "light", "grey"];
    const validFonts = ["12px", "14px", "16px"];
    const validIdleTimes = [60, 120, 180, 300, 600];

    if (
      !validThemes.includes(theme) ||
      !validFonts.includes(font) ||
      !validIdleTimes.includes(autoSaveIdleTime)
    ) {
      showMessage("Invalid settings values", "warning");
      return;
    }

    const result = await safeStorageOperation(
      () =>
        chrome.storage.local.set({
          theme,
          font,
          autoSaveEnabled,
          autoSaveIdleTime,
          autoSaveShowNotification,
        }),
      "saving settings"
    );

    if (result.success) {
      // Apply settings immediately
      applySettings(theme, font);
      updateThemeToggleIcon(theme);

      // Notify background script about auto-save settings
      try {
        await chrome.runtime.sendMessage({
          action: "updateAutoSaveSettings",
          settings: {
            autoSaveEnabled,
            autoSaveIdleTime,
            autoSaveShowNotification,
          },
        });
      } catch (error) {
        console.error("Error updating auto-save settings:", error);
      }

      closeSettings();
      showMessage("Settings saved!", "success");
    }
  } catch (error) {
    console.error("Error saving settings:", error);
    showMessage("Failed to save settings. Please try again.", "warning");
  }
};

// Apply theme and font settings
function applySettings(theme, font) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-font-size", font);
}

function updateThemeToggleIcon(theme) {
  if (!themeToggleIcon) return;
  if (theme === "light") {
    themeToggleIcon.textContent = "light_mode";
  } else {
    themeToggleIcon.textContent = "dark_mode";
  }
}

// Theme toggle button
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", async () => {
    try {
      const result = await safeStorageOperation(
        () => chrome.storage.local.get(["theme", "font"]),
        "loading theme settings"
      );

      if (!result.success) return;

      const { theme = "dark", font = "14px" } = result.data;
      const nextTheme = theme === "light" ? "dark" : "light";
      
      const saveResult = await safeStorageOperation(
        () => chrome.storage.local.set({ theme: nextTheme }),
        "saving theme"
      );

      if (saveResult.success) {
        applySettings(nextTheme, font);
        updateThemeToggleIcon(nextTheme);
        showMessage(`Theme set to ${nextTheme}`, "success");
      }
    } catch (e) {
      console.error("Error toggling theme", e);
      showMessage("Failed to toggle theme. Please try again.", "warning");
    }
  });
}

// ======= Storage Metrics & Dashboard Updates =======
async function updateDashboardMetrics() {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs", "savedSessions"]),
      "loading storage data for metrics"
    );

    if (!result.success) return;

    const { savedTabs = [], savedSessions = [] } = result.data;

    if (statsTotal) statsTotal.textContent = savedTabs.length;
    if (statsFavorites) statsFavorites.textContent = savedTabs.filter((t) => t.favorite).length;
    if (statsSessions) statsSessions.textContent = savedSessions.length;

    if (statsStorage) {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        if (chrome.runtime.lastError) {
          statsStorage.textContent = "N/A";
          return;
        }
        if (bytes < 1024) {
          statsStorage.textContent = `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
          statsStorage.textContent = `${(bytes / 1024).toFixed(2)} KB`;
        } else {
          statsStorage.textContent = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
      });
    }
  } catch (error) {
    console.error("Error updating dashboard metrics:", error);
  }
}

// ======= Bulk Selection Logic =======
function updateBulkControlsUI() {
  if (!bulkControls) return;

  const visibleCheckboxes = Array.from(tabList.querySelectorAll(".tab-checkbox"));
  const visibleCount = visibleCheckboxes.length;

  // Show bulk controls only if there are visible items
  if (visibleCount > 0) {
    bulkControls.classList.remove("hidden");
  } else {
    bulkControls.classList.add("hidden");
  }

  if (selectedCountText) {
    selectedCountText.textContent = `Selected: ${selectedTabUrls.length} Tabs`;
  }

  // Update "Select All" checkbox state
  if (selectAllCheckbox) {
    if (visibleCount > 0 && visibleCheckboxes.every((cb) => cb.checked)) {
      selectAllCheckbox.checked = true;
      if (selectAllLabel) selectAllLabel.textContent = "Unselect All";
    } else {
      selectAllCheckbox.checked = false;
      if (selectAllLabel) selectAllLabel.textContent = "Select All";
    }
  }
}

async function bulkOpenSelected() {
  if (selectedTabUrls.length === 0) {
    showMessage("No tabs selected", "warning");
    return;
  }

  if (selectedTabUrls.length > 20) {
    const confirmed = confirm(`This will open ${selectedTabUrls.length} tabs. Continue?`);
    if (!confirmed) return;
  }

  showMessage(`Opening ${selectedTabUrls.length} tabs...`, "info");

  const result = await safeStorageOperation(
    () => chrome.storage.local.get(["savedTabs"]),
    "loading tabs for bulk open"
  );
  if (!result.success) return;

  const { savedTabs = [] } = result.data;
  const tabsToOpen = savedTabs.filter((t) => selectedTabUrls.includes(t.url));

  const response = await chrome.runtime.sendMessage({
    action: "openTabs",
    tabs: tabsToOpen,
  });

  if (response && response.success) {
    if (response.failCount === 0) {
      showMessage(`Successfully opened all ${response.successCount} tabs!`, "success");
    } else {
      showMessage(`Opened ${response.successCount} tabs, ${response.failCount} failed`, "warning");
    }
  } else {
    showMessage("Failed to open tabs.", "warning");
  }
}

async function bulkExportSelected() {
  if (selectedTabUrls.length === 0) {
    showMessage("No tabs selected", "warning");
    return;
  }

  const result = await safeStorageOperation(
    () => chrome.storage.local.get(["savedTabs"]),
    "loading tabs for bulk export"
  );
  if (!result.success) return;

  const { savedTabs = [] } = result.data;
  const tabsToExport = savedTabs.filter((t) => selectedTabUrls.includes(t.url) && isValidTab(t));

  if (tabsToExport.length === 0) {
    showMessage("No valid tabs to export", "warning");
    return;
  }

  const jsonData = JSON.stringify(tabsToExport, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `tab-saver-bulk-export-${timestamp}.json`;

  await chrome.downloads.download({ url, filename }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.warn("Download error:", chrome.runtime.lastError.message);
      showMessage("Failed to export tabs.", "warning");
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showMessage(`${tabsToExport.length} tabs exported successfully!`, "success");
  });
}

async function bulkDeleteSelected() {
  if (selectedTabUrls.length === 0) {
    showMessage("No tabs selected", "warning");
    return;
  }

  const confirmed = confirm(`Delete ${selectedTabUrls.length} selected tabs? This cannot be undone.`);
  if (!confirmed) return;

  const result = await safeStorageOperation(
    () => chrome.storage.local.get(["savedTabs"]),
    "loading tabs for bulk delete"
  );
  if (!result.success) return;

  const { savedTabs = [] } = result.data;
  const filtered = savedTabs.filter((t) => !selectedTabUrls.includes(t.url));

  const saveResult = await safeStorageOperation(
    () => chrome.storage.local.set({ savedTabs: filtered }),
    "bulk deleting tabs"
  );

  if (saveResult.success) {
    const deletedCount = selectedTabUrls.length;
    selectedTabUrls = [];
    await refreshTabsList();
    updateDashboardMetrics();
    showMessage(`Deleted ${deletedCount} tabs!`, "success");
  }
}

// ======= Duplicate Tab Detector & Safe Removal =======
async function scanDuplicates() {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading tabs for duplicates scan"
    );
    if (!result.success) return;

    const { savedTabs = [] } = result.data;
    const urlCounts = {};
    savedTabs.forEach((tab) => {
      urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
    });

    let duplicateCount = 0;
    Object.values(urlCounts).forEach((count) => {
      if (count > 1) {
        duplicateCount += (count - 1);
      }
    });

    if (duplicateCountSpan) {
      duplicateCountSpan.textContent = duplicateCount > 0
        ? `Found ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''}`
        : "No duplicates found";
    }

    if (removeDuplicatesBtn) {
      removeDuplicatesBtn.disabled = duplicateCount === 0;
    }

    if (duplicateCleanResult) {
      duplicateCleanResult.style.display = "block";
      duplicateCleanResult.textContent = duplicateCount > 0
        ? `Duplicate URLs detected. Ready for safe cleanup.`
        : "Your saved tabs are already clean!";
    }
  } catch (error) {
    console.error("Error scanning duplicates:", error);
    showMessage("Failed to scan duplicates", "warning");
  }
}

async function removeDuplicates() {
  try {
    const result = await safeStorageOperation(
      () => chrome.storage.local.get(["savedTabs"]),
      "loading tabs for duplicate removal"
    );
    if (!result.success) return;

    const { savedTabs = [] } = result.data;

    // Measure bytes in use before
    const bytesBefore = await new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => resolve(bytes || 0));
    });

    // Group by URL
    const groups = {};
    savedTabs.forEach((tab) => {
      if (!groups[tab.url]) {
        groups[tab.url] = [];
      }
      groups[tab.url].push(tab);
    });

    const cleanedTabs = [];
    let removedCount = 0;

    Object.keys(groups).forEach((url) => {
      const list = groups[url];
      // Sort by savedAt ascending (oldest first)
      list.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));

      // Keep the first (oldest), discard the rest
      cleanedTabs.push(list[0]);
      removedCount += (list.length - 1);
    });

    // Keep original descending sorting order (most recent first)
    cleanedTabs.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    const saveResult = await safeStorageOperation(
      () => chrome.storage.local.set({ savedTabs: cleanedTabs }),
      "saving cleaned tabs"
    );

    if (saveResult.success) {
      // Measure bytes in use after
      const bytesAfter = await new Promise((resolve) => {
        chrome.storage.local.getBytesInUse(null, (bytes) => resolve(bytes || 0));
      });

      const bytesSaved = bytesBefore - bytesAfter;
      let savedText = "";
      if (bytesSaved > 0) {
        if (bytesSaved < 1024) {
          savedText = ` (${bytesSaved} Bytes saved)`;
        } else {
          savedText = ` (${(bytesSaved / 1024).toFixed(2)} KB saved)`;
        }
      }

      if (duplicateCountSpan) {
        duplicateCountSpan.textContent = "Cleaned";
      }
      if (removeDuplicatesBtn) {
        removeDuplicatesBtn.disabled = true;
      }

      if (duplicateCleanResult) {
        duplicateCleanResult.style.display = "block";
        duplicateCleanResult.textContent = `Removed ${removedCount} duplicates${savedText}!`;
      }

      await refreshTabsList();
      updateDashboardMetrics();
      showMessage(`Successfully removed ${removedCount} duplicates!`, "success");
    }
  } catch (error) {
    console.error("Error removing duplicates:", error);
    showMessage("Failed to remove duplicates", "warning");
  }
}

// Bind bulk select and duplicate detector event listeners
tabList.addEventListener("change", (e) => {
  if (e.target.classList.contains("tab-checkbox")) {
    const url = e.target.dataset.url;
    if (e.target.checked) {
      if (!selectedTabUrls.includes(url)) {
        selectedTabUrls.push(url);
      }
    } else {
      selectedTabUrls = selectedTabUrls.filter((u) => u !== url);
    }
    updateBulkControlsUI();
  }
});

if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener("change", (e) => {
    const visibleCheckboxes = Array.from(tabList.querySelectorAll(".tab-checkbox"));
    if (e.target.checked) {
      visibleCheckboxes.forEach((cb) => {
        cb.checked = true;
        const url = cb.dataset.url;
        if (!selectedTabUrls.includes(url)) {
          selectedTabUrls.push(url);
        }
      });
    } else {
      visibleCheckboxes.forEach((cb) => {
        cb.checked = false;
        const url = cb.dataset.url;
        selectedTabUrls = selectedTabUrls.filter((u) => u !== url);
      });
    }
    updateBulkControlsUI();
  });
}

if (bulkOpenBtn) bulkOpenBtn.onclick = bulkOpenSelected;
if (bulkExportBtn) bulkExportBtn.onclick = bulkExportSelected;
if (bulkDeleteBtn) bulkDeleteBtn.onclick = bulkDeleteSelected;

if (scanDuplicatesBtn) scanDuplicatesBtn.onclick = scanDuplicates;
if (removeDuplicatesBtn) removeDuplicatesBtn.onclick = removeDuplicates;

// Category UI behavior
if (categorySelect) {
  const syncCategoryUI = () => {
    if (categorySelect.value === "Custom") {
      customCategoryInput?.classList.remove("hidden");
      customCategoryInput?.focus();
    } else {
      customCategoryInput?.classList.add("hidden");
    }
  };
  categorySelect.addEventListener("change", syncCategoryUI);
  try { syncCategoryUI(); } catch (e) {}
}

// ======= Initial Load =======
document.addEventListener("DOMContentLoaded", async () => {
  // Rehydrate modal references after full DOM is available
  sessionNameInput = document.querySelector("#sessionNameInput") || null;
  saveSessionModal = document.querySelector("#saveSessionModal") || null;
  confirmSaveBtn = document.querySelector("#confirmSaveBtn") || null;
  cancelSaveBtn = document.querySelector("#cancelSaveBtn") || null;
  sessionNameError = document.querySelector("#sessionNameError") || null;

  saveAllModeModal = document.querySelector("#saveAllModeModal") || null;
  saveAllCountMessage = document.querySelector("#saveAllCountMessage") || null;
  cancelSaveAllModeBtn = document.querySelector("#cancelSaveAllModeBtn") || null;
  continueSaveAllModeBtn = document.querySelector("#continueSaveAllModeBtn") || null;
  sessionCategorySelect = document.querySelector("#sessionCategorySelect") || null;
  sessionCustomCategoryInput = document.querySelector("#sessionCustomCategoryInput") || null;

  // Ensure modal event handlers are bound after rehydration
  try { setupSaveSessionModalHandlers(); } catch (e) {}
  try { setupSaveAllModeModalHandlers(); } catch (e) {}

  if (!validateDOMElements()) {
    console.error(
      "Critical DOM elements missing. Extension may not work properly."
    );
    return;
  }



  loadTabs();
  // Also load saved sessions UI
  try { await loadSessions(); } catch (e) {}
  try { validateUI && validateUI(); } catch (e) {}
});



// ======= UI Self-check =======
function validateUI() {
  const required = {
    sessionNameInput,
    saveSessionModal,
    confirmSaveBtn,
    cancelSaveBtn,
    sessionNameError,
    saveAllModeModal,
    saveAllCountMessage,
    cancelSaveAllModeBtn,
    continueSaveAllModeBtn,
    sessionCategorySelect,
    sessionCustomCategoryInput,
  };
  Object.entries(required).forEach(([key, val]) => {
    if (!val) console.warn(`⚠️ Missing element in popup.html: ${key}`);
  });
}

// Avoid early false warnings before DOM is ready
try {
  if (document.readyState === "complete") {
    validateUI();
  }
} catch (e) {}
