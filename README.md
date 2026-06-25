# Tab Saver Pro

**Tab Saver Pro** is a modern, privacy-focused browser extension for Chrome and Firefox designed to save, organize, categorize, restore, and manage your tabs and sessions. Features include daily/weekly automatic backups with rotation, dashboard analytics, search indexing, smart duplicate tab cleaner, custom session categorization, and visual theme options.

[![Version](https://img.shields.io/badge/Release-v3.2.0-blue.svg?style=for-the-badge)](https://github.com/kronpatel/Advance-Tab-Saver/releases)
[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Ready-green.svg?style=for-the-badge)](https://chrome.google.com/webstore)
[![Firefox AMO](https://img.shields.io/badge/Firefox_AMO-Ready-orange.svg?style=for-the-badge)](https://addons.mozilla.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

---

## 🎯 Key Features

- **💾 Automated Backups**: Configure daily or weekly automatic database backups with custom retention limits (5, 10, or 20 backups) and manual triggers.
- **⏱️ Recently Saved Panel**: Quickly view, open, clipboard-copy, or delete recently saved tabs directly from the statistics dashboard.
- **🧹 Smart Duplicate Cleaner**: Ignore case variations, query parameter tracking strings (`utm_*`, `ref`), and matching trailing slashes for O(N) duplicate removal.
- **⭐ Pin Favorites**: Star (☆/★) and pin critical bookmarks to the top of your layout list.
- **🗂️ Bulk Options**: Batch select checkboxes to restore, export, or delete sets of tabs in one go.
- **📊 Real-time Dashboard**: Track total items and local storage bytes in use via 2x2 statistics widgets.
- **🎨 Visual Themes**: Seamlessly switch between calibrated Light, Dark, and Grey themes matching system aesthetics.
- **🔒 Security & Privacy Hardening**: Safe text-node bindings, local-first architectures, explicit z-index modal hierarchies, and OS-motion accessibility overrides.

---

## 🎉 What's New in v3.2.0 (Hardening & Compatibility)

- **🦊 Native Firefox MV3 Support**: Fully compliant background event page logic and specific Gecko manifest (`manifest.firefox.json`) for AMO.
- **♿ Reduced Motion Preferences**: Full support for `prefers-reduced-motion: reduce` preventing bounce-scaling transitions and slide effects.
- **🛡️ Custom Modal Styling**: Polished dark slate overlay styling with backdrop blur filters (`blur(8px)`), safe outline focus rings, and explicit z-index constraints.
- **📘 Architecture Documentation**: Inline configuration architecture comments inside `config.js`.

---

## 🎉 What's New in v3.1.0

- **💾 Automated Local Backups**: Daily/weekly scheduling and retention policies.
- **👁️ Restore Preview Dialog**: A comparative metrics view mapping backup sizes, tab counts, and loss warnings side-by-side.
- **🧹 URL Normalization**: Normalizer filters designed to sanitize tracking strings during duplicate checks.

---

## 🧱 Project Structure

- [manifest.json](manifest.json) — Extension manifest configurations for Google Chrome.
- [manifest.firefox.json](manifest.firefox.json) — Tailored extension configurations for Mozilla Firefox.
- [popup.html](popup.html) — Extension dashboard HTML interface.
- [popup.js](popup.js) — Popup UI and browser event controllers.
- [background.js](background.js) — Background Service Worker and alarms lifecycle listener.
- [shared.js](shared.js) — Shared utility functions namespace.
- [config.js](config.js) — Shared environment parameters definition.
- [style.css](style.css) — Clean, modern styling sheets.
- [icons/](icons/) — Product logo directories.

---

## 🛠️ Installation Guide

### Google Chrome
1. Download this repository code as a ZIP file and extract it.
2. Navigate to `chrome://extensions/` in Chrome.
3. Turn on the **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left and select the extracted project folder (containing `manifest.json`).

### Mozilla Firefox
1. Open Mozilla Firefox and type `about:debugging#/runtime/this-firefox` in the address bar.
2. Click **Load Temporary Add-on...** on the right side.
3. Rename `manifest.firefox.json` to `manifest.json` temporarily (or copy it over the main one) and select the file in the project folder to register the extension.

---

## 🔒 Security & Privacy

Tab Saver Pro is developed with strict **offline-first security**:
- **No external servers or tracking scripts**: All operations run inside your browser. No analytics, telemetry, or third-party requests.
- **Local JSON Backups**: Manual exports and automated backup histories are kept only inside your local browser storage (`chrome.storage.local`).
- **DOM Sanitization**: Protects against Cross-Site Scripting (XSS) by using safe HTML element bindings and whitelisted URL protocol checks.
- For complete policy details, please read the [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) documents.

---

## 📋 Manifest Permissions

This extension requests the minimum permissions necessary to function:
- `tabs` — Required to query active window tabs for saving.
- `storage` — Required to store saved tabs, settings, and local backups.
- `downloads` — Required to export tab backups as JSON files.
- `idle` — Required to execute auto-saves when the user is inactive.
- `notifications` — Required to alert when auto-saves execute.
- `alarms` — Required to trigger periodic backup sweeps.

---

## ❓ FAQ & Troubleshooting

### Why did a tab backup restore skip file URLs?
By default, browser extensions cannot open local `file://` paths unless you explicitly enable it in your browser's extension settings page under **Allow access to file URLs**.

### How does duplicate detection handle query parameters?
Tab Saver Pro strips marketing tracking parameters (such as `utm_source`, `ref`, and `utm_medium`) and ignores trailing slashes, so `https://example.com/` and `https://example.com?utm_source=ref` are matched as duplicates.

---

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) files for guidelines.

### Developed by [@kronpatel](https://github.com/kronpatel)
Made with ❤️ for clean interfaces and tab hygiene.
