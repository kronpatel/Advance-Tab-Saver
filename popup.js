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

// ======= Message Bar Function =======
function showMessage(msg, type = "info") {
  messageBar.textContent = msg;
  messageBar.className = "ag-message " + type;
  messageBar.style.display = "block";
  setTimeout(() => {
    messageBar.style.display = "none";
  }, 2000);
}

// ======= Tab Switching =======
actionsTab.onclick = () => {
  actionsTab.classList.add("ag-tab-btn-active");
  statsTab.classList.remove("ag-tab-btn-active");
  actionsContent.style.display = "";
  statsContent.style.display = "none";
};
statsTab.onclick = () => {
  statsTab.classList.add("ag-tab-btn-active");
  actionsTab.classList.remove("ag-tab-btn-active");
  actionsContent.style.display = "none";
  statsContent.style.display = "";
  // Update stats
  chrome.storage.local.get(['savedTabs'], ({ savedTabs = [] }) => {
    document.getElementById("statsTotal").textContent = savedTabs.length;
    if (savedTabs.length) {
      document.getElementById("statsLast").textContent = new Date(savedTabs[savedTabs.length - 1].savedAt).toLocaleString();
    } else {
      document.getElementById("statsLast").textContent = "N/A";
    }
  });
};

// ======= Render Tabs =======
function renderTabs(tabs) {
  tabList.innerHTML = '';
  const grouped = {};
  tabs.forEach(tab => {
    const date = new Date(tab.savedAt).toLocaleDateString();
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(tab);
  });

  for (const date in grouped) {
    const group = document.createElement("div");
    group.className = "tab-group";
    const header = document.createElement("h4");
    header.textContent = date;
    group.appendChild(header);

    grouped[date].forEach(tab => {
      const div = document.createElement("div");
      div.className = "tab";
      div.innerHTML = `
        <img class="favicon" src="${tab.favicon || 'default-favicon.png'}" />
        <span title="${tab.url}">${tab.title}</span>
        <button data-url="${tab.url}" class="open" title="Open"><span class="material-icons">open</span>
      </button> 
        <button data-url="${tab.url}" class="delete" title="Delete"><span class="material-icons">&#xe872;</span>
      </button>
      `;
      group.appendChild(div);
    });

    tabList.appendChild(group);
  } 

  tabCount.textContent = tabs.length;
  if (totalTabs) totalTabs.textContent = `Total saved: ${tabs.length}`;
}

// ======= Load Tabs =======
async function loadTabs() {
  const { savedTabs = [], theme = 'dark', font = '14px' } = await chrome.storage.local.get();
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.setProperty('--font-size', font);
  renderTabs(savedTabs);
}

// ======= Tab List Actions =======
tabList.addEventListener("click", async (e) => {
  if (e.target.closest(".open")) {
    chrome.tabs.create({ url: e.target.closest(".open").dataset.url });
  } else if (e.target.closest(".delete")) {
    const url = e.target.closest(".delete").dataset.url;
    const { savedTabs } = await chrome.storage.local.get();
    const filtered = savedTabs.filter(t => t.url !== url);
    await chrome.storage.local.set({ savedTabs: filtered });
    loadTabs();
    showMessage("Tab deleted!", "success");
  }
});

// ======= Save Current Tab =======
saveCurrentBtn.onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const { savedTabs = [] } = await chrome.storage.local.get();

  if (!savedTabs.find(t => t.url === tab.url)) {
    savedTabs.push({
      title: tab.title,
      url: tab.url,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}`,
      savedAt: Date.now()
    });
    await chrome.storage.local.set({ savedTabs });
    loadTabs();
    showMessage("Tab saved!", "success");
  } else {
    showMessage("This tab is already saved!", "warning");
  }
};

// ======= Save All Tabs =======
saveAllBtn.onclick = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const { savedTabs = [] } = await chrome.storage.local.get();

  let added = 0, skipped = 0;
  for (const tab of tabs) {
    if (!savedTabs.find(t => t.url === tab.url)) {
      savedTabs.push({
        title: tab.title,
        url: tab.url,
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}`,
        savedAt: Date.now()
      });
      added++;
    } else {
      skipped++;
    }
  }

  await chrome.storage.local.set({ savedTabs });
  loadTabs();
  if (added && skipped) showMessage(`${added} tab(s) saved, ${skipped} duplicate(s) skipped.`, "info");
  else if (added) showMessage("All tabs saved!", "success");
  else showMessage("All tabs are already saved!", "warning");
};

// ======= Open All Tabs =======
openAllBtn.onclick = async () => {
  const { savedTabs = [] } = await chrome.storage.local.get();
  savedTabs.forEach(tab => chrome.tabs.create({ url: tab.url }));
};

// ======= Clear All Tabs =======
clearBtn.onclick = async () => {
  if (confirm("Clear all saved tabs?")) {
    await chrome.storage.local.remove("savedTabs");
    loadTabs();
    showMessage("All saved tabs deleted!", "success");
  }
};

// ======= Export Tabs =======
exportBtn.onclick = async (e) => {
  e.preventDefault();
  const { savedTabs = [] } = await chrome.storage.local.get();
  const blob = new Blob([savedTabs.map(t => `${t.title}\n${t.url}`).join('\n\n')], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: "tabs.txt" });
  showMessage("Tabs exported!", "success");
};

// ======= Import Tabs =======
importBtn.onclick = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt";
  input.onchange = async () => {
    const file = input.files[0];
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);
    const tabs = [];
    for (let i = 0; i < lines.length; i += 2) {
      const title = lines[i];
      const url = lines[i + 1];
      try {
        if (!url || !url.startsWith("http")) continue;
        tabs.push({
          title,
          url,
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`,
          savedAt: Date.now()
        });
      } catch (e) {
        // skip bad entry
      }
    }

    const { savedTabs = [] } = await chrome.storage.local.get();
    const newTabs = [...savedTabs, ...tabs.filter(t => !savedTabs.find(st => st.url === t.url))];
    await chrome.storage.local.set({ savedTabs: newTabs });
    loadTabs();
    showMessage("Tabs imported!", "success");
  };
  input.click();
};

// ======= Search =======
searchInput.oninput = async () => {
  const { savedTabs = [] } = await chrome.storage.local.get();
  const q = searchInput.value.toLowerCase();
  const filtered = savedTabs.filter(t => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q));
  renderTabs(filtered);
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
  await chrome.storage.local.set({
    theme: themeSelect.value,
    font: fontSelect.value
  });
  closeSettings();
  loadTabs();
  showMessage("Settings saved!", "success");
};

// ======= Initial Load =======
document.addEventListener("DOMContentLoaded", loadTabs);

// ======= GOOGLE SIGN-IN & DRIVE SYNC (chrome.identity) =======
const CLIENT_ID = '623086085237-ujfrhp5rvkg2j38h7s2hgu94944qg361.apps.googleusercontent.com'; // <-- Yahan apna Client ID daalein
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

let userEmail = null;
let accessToken = null;

// Google Sign-In
googleSignInBtn.onclick = async () => {
  chrome.identity.getAuthToken({ interactive: true }, async (token) => {
    if (chrome.runtime.lastError || !token) {
      showMessage("Sign-in failed!", "warning");
      return;
    }
    accessToken = token;
    // Get user email
    const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const data = await resp.json();
    userEmail = data.email;
    googleUserInfo.style.display = "block";
    googleUserInfo.textContent = `Signed in as: ${userEmail}`;
    googleSignInBtn.style.display = "none";
    googleSignOutBtn.style.display = "inline-block";
    showMessage("Signed in!", "success");
  });
};

googleSignOutBtn.onclick = () => {
  chrome.identity.getAuthToken({ interactive: false }, function(token) {
    if (token) {
      chrome.identity.removeCachedAuthToken({ token: token }, function() {
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
  if (!accessToken) {
    showMessage("Please sign in with Google first!", "warning");
    return;
  }
  const { savedTabs = [] } = await chrome.storage.local.get();
  const fileContent = JSON.stringify(savedTabs);

  // Check if file exists
  const listResp = await fetch(`${DRIVE_FILES_URL}?spaces=appDataFolder&q=name='tabsaverpro.json'&fields=files(id,name)`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  const listData = await listResp.json();
  let fileId = null;
  if (listData.files && listData.files.length > 0) {
    fileId = listData.files[0].id;
  }

  const metadata = {
    name: 'tabsaverpro.json',
    parents: ['appDataFolder']
  };

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    close_delim;

  let method = fileId ? 'PATCH' : 'POST';
  let url = fileId
    ? `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;

  await fetch(url, {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'multipart/related; boundary="' + boundary + '"'
    },
    body: multipartRequestBody
  });

  showMessage("Tabs synced to Google Drive!", "success");
};

// Restore from Google Drive
restoreFromDriveBtn.onclick = async () => {
  if (!accessToken) {
    showMessage("Please sign in with Google first!", "warning");
    return;
  }
  const listResp = await fetch(`${DRIVE_FILES_URL}?spaces=appDataFolder&q=name='tabsaverpro.json'&fields=files(id,name)`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  const listData = await listResp.json();
  if (!listData.files || listData.files.length === 0) {
    showMessage("No backup found in Google Drive!", "warning");
    return;
  }
  const fileId = listData.files[0].id;
  const fileResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  const tabs = await fileResp.json();
  await chrome.storage.local.set({ savedTabs: tabs });
  loadTabs();
  showMessage("Tabs restored from Google Drive!", "success");
};