// Tab Saver Pro
// Copyright (c) 2025 KERZOX. All rights reserved.
// // Optional: Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ savedTabs: [], theme: 'dark', font: '14px' });
});