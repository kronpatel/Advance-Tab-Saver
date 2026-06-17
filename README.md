# Advance-Tab-Saver

**Advance Tab Saver** is a modern productivity-focused Chrome extension for saving, organizing, categorizing, restoring, and managing browser tabs and sessions with favorites, bulk actions, duplicate detection, and JSON backup support.

[![GitHub Tag](https://img.shields.io/github/v/tag/kronpatel/Advance-Tab-Saver?style=for-the-badge&label=Release&color=blue)](https://github.com/kronpatel/Advance-Tab-Saver/releases)
[![GitHub Stars](https://img.shields.io/github/stars/kronpatel/Advance-Tab-Saver?style=for-the-badge&color=gold)](https://github.com/kronpatel/Advance-Tab-Saver/stargazers)
[![Coming Soon on Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-blue?logo=google-chrome&style=for-the-badge)](#)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

See the [Changelog](./CHANGELOG.md) for release notes.

---

## 🎯 Key Features

* **💾 Auto Backup System:** Configure daily/weekly automatic backups of saved tabs and sessions with smart file rotation and manual creation triggers.
* **⏱️ Recently Saved Widget:** View your latest saved tabs directly on the dashboard with quick action links (Open, Copy, Delete).
* **👁️ Restore Preview Dialog:** Verify backup details, sizes, and check for potential data loss warnings side-by-side before restoring.
* **🧹 Smart Duplicate Prevention:** Advanced URL normalization that ignores case differences, matching trailing slashes, and strips tracking parameters (`utm`, `ref`).
* **⭐ Favorites Support:** Highlight and pin your most critical saved tabs to the top of your workspace with one click.
* **🗂️ Bulk Tab Saving:** Consolidate active windows into named sessions, or select multiple saved tabs to batch open, delete, or export.

---

## 🎉 What's New in v3.1.0

Version `3.1.0` introduces automated data protection, smart duplicate filters, and an analytics widget:

* **💾 Automatic Backup System:** Configurable daily or weekly automatic backups of saved tabs and sessions, complete with local retention limit controls (5, 10, or 20) and a "Create Backup Now" trigger in Settings.
* **⏱️ Recently Saved Widget:** A dynamic dashboard panel in the Statistics tab displaying your latest saved tabs, complete with favicon support, "time-ago" indicators, restoration links, clipboard copies, and deletions.
* **👁️ Restore Preview Dialog:** Prevent accidental data loss. Clicking restore triggers a side-by-side comparison modal highlighting data size, counts, and a clear red warning indicating exactly how many tabs/sessions you might lose.
* **⚡ Auto Save Improvements:** Optimized Manifest V3 background service worker alarm polling and persistent cooldown checks, preventing write flooding while ensuring robust idle-state saves.
* **🧹 Smart Duplicate Prevention:** Advanced URL normalization that ignores case differences, matching trailing slashes, and stripping out marketing trackers (`utm_*`, `ref`) before comparisons.

---

## 🎉 What's New in v3.0.0

Version `3.0.0` is a major upgrade introducing massive productivity improvements, a complete SaaS-style UI redesign, and security enhancements:

* **⭐ Favorites System:** Instantly star (☆ / ★) saved tabs to pin them to the top of your list.
* **🗂️ Bulk Selection:** Batch select tabs to restore, delete, or export them in one click.
* **🧹 Duplicate Tab Cleaner:** Clean duplicate saved URLs safely while keeping the oldest records.
* **📊 Analytics Dashboard:** A real-time 2x2 statistics panel tracking database entries and storage footprint.
* **🎨 Calibration Themes:** Seamlessly swap between polished Light, Dark, and Grey themes.
* **🔒 Security & Performance:** Transitioned data persistence to standard local storage, fixed XSS vulnerability, resolved background worker lifecycle bugs, and reduced rendering paint overhead by replacing CSS wildcards.
* **💾 Local-First Security:** Complete removal of external OAuth/Google-sync trackers in favor of clean local JSON backups and restore.





## 🧱 Project Structure

- background.js → Handles background logic and message passing
- manifest.json → Defines extension metadata and permissions
- popup.html → Popup interface shown when the extension icon is clicked
- popup.js → Logic for popup interactions and tab management
- style.css → Styles for the popup interface
- icons/ → Contains the extension icon (icon48.png)

## 🛠️ Chrome Installation Guide

1. **Download the Code**: Click **Code > Download ZIP** on GitHub and extract the archive on your local computer.
2. **Open Extensions Page**: Open Google Chrome and navigate to `chrome://extensions/`.
3. **Enable Developer Mode**: Turn on the **Developer mode** toggle switch in the top-right corner.
4. **Load Unpacked**: Click the **Load unpacked** button in the top-left corner and select the extracted folder (containing `manifest.json`).
5. **Pin the Extension**: Click the Extensions (puzzle piece) icon in your toolbar, pin **Tab Saver Pro**, and open it.



## 🔮 Future Improvements

- [ ] Custom keyboard shortcuts for quick tab saving and dashboard toggle.
- [ ] Unified search indexing to query tab titles, URLs, and session names simultaneously.

--- 

## 🤝 Contributing

Contributions are always welcome!  
To contribute:
1. Fork this repository.  
2. Create a new branch (`feature/your-feature-name`).  
3. Make your changes and commit them.  
4. Submit a Pull Request with a clear description of your update.

---
## 🏁 Contributors

<a href="https://github.com/kronpatel/Advance-Tab-Saver/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=kronpatel/Advance-Tab-Saver" />
</a>


### 💡 Author
---
Developed by [@kronpatel](https://github.com/kronpatel)  
Made with ❤️ for productivity and better tab management.
