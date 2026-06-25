# Privacy Policy — Tab Saver Pro

Tab Saver Pro is committed to protecting your privacy. This document outlines how the extension manages your browsing details.

---

## 🔒 Offline-First, Local-First Architecture

- **No Remote Servers**: Tab Saver Pro is a local-only browser extension. We do not host any remote servers, cloud databases, or external services to sync your tab information.
- **No Analytics, Telemetry, or Tracking**: The extension does not record, log, profile, or transmit your usage patterns, tab history, or saved session details. No third-party tracking scripts (such as Google Analytics or Mixpanel) are bundled within the package.
- **Local Storage Only**: All saved tabs, custom categories, configuration settings, and scheduled backup histories are persisted exclusively within your browser's local sandbox using the `chrome.storage.local` API.

---

## 📋 Permissions Explanation

To provide tab management, session saving, and automatic backups, the extension requests the following permissions from your browser:

1. **`tabs`**
   - **Why**: Required to retrieve the title, URL, and favicon properties of active tabs in your open windows when you click the "Save Tab" or "Save Session" buttons.
2. **`storage`**
   - **Why**: Required to write, read, and delete your saved tabs list, configuration preferences, and backup history from local storage.
3. **`downloads`**
   - **Why**: Required to save your exported tab lists as raw JSON files to your local Downloads directory when you click "Export".
4. **`idle`**
   - **Why**: Required to check if your computer is currently idle or locked, allowing the auto-save feature to run safely in the background without interfering with your work.
5. **`notifications`**
   - **Why**: Required to display brief browser desktop alerts when an automated tab auto-save completes.
6. **`alarms`**
   - **Why**: Required to schedule and execute periodic checks for automatic backups.

---

## 💾 Data Backups and Export

When you export your tabs or configuration, a plain text JSON file is generated locally in your browser memory and sent directly to your system's download manager. No data is sent over the network. You have full control over these backup files.
