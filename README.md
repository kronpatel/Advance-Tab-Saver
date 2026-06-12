# Advance-Tab-Saver

**Advance Tab Saver** is a modern productivity-focused Chrome extension for saving, organizing, categorizing, restoring, and managing browser tabs and sessions with favorites, bulk actions, duplicate detection, and JSON backup support.

[![GitHub Release](https://img.shields.io/github/v/release/kronpatel/Advance-Tab-Saver?style=for-the-badge)](https://github.com/kronpatel/Advance-Tab-Saver/releases/latest)
[![GitHub Stars](https://img.shields.io/github/stars/kronpatel/Advance-Tab-Saver?style=for-the-badge)](https://github.com/kronpatel/Advance-Tab-Saver/stargazers)
[![Coming Soon on Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-blue?logo=google-chrome&style=for-the-badge)](#)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

# Advance Tab Saver
See the [Changelog](./CHANGELOG.md) for release notes.


---

## 🚀 Features

- **Save & Restore:** Save individual tabs, save all active tabs, or restore saved sessions easily.
- **Favorites / Starred Tabs:** Star important tabs to keep them at the top of your list.
- **Bulk Selection & Actions:** Toggle select all, open, export, or delete multiple tabs simultaneously.
- **Duplicate Tab Cleaner:** Scan and remove duplicate URLs instantly to save storage.
- **Storage Dashboard Metrics:** Real-time analytics tracking total tabs, favorites, saved sessions, and current local storage usage.
- **Category Filtering & Session Categories:** Organize tabs and sessions into curated categories (Work, Project, Study, Personal, Custom).
- **JSON Import / Export:** Create local backups of your saved tabs as JSON files and import them without data loss.
- **Premium UI:** Hardware-accelerated transitions, responsive cards, clean empty state screens, and selectable Light, Dark, or Grey themes.

---

## 📸 Screenshots

(Add screenshots here before release)

---

## 🧱 Project Structure

- background.js → Handles background logic and message passing
- manifest.json → Defines extension metadata and permissions
- popup.html → Popup interface shown when the extension icon is clicked
- popup.js → Logic for popup interactions and tab management
- style.css → Styles for the popup interface
- icons/ → Contains the extension icon (icon48.png)

## 🛠 Installation & Setup

1. Clone or download this repository.  
2. Open **Google Chrome** (or any Chromium-based browser).  
3. Go to **chrome://extensions/**.  
4. Enable **Developer mode** (top right corner).  
5. Click **Load unpacked** and select this project folder (where `manifest.json` exists).  
6. The extension icon will appear in your toolbar — click it to open and use the tab saver.

---

## 💾 Storage Format

```js
// OLD:
// { id, tabs }

// NEW session object stored in chrome.storage.local.savedSessions:
{
  id: Number,
  name: String,
  tabs: Array,
  createdAt: ISOString
}
```

No migration is needed; existing users without `name` will continue to work. The UI may be updated in a subsequent step to list sessions by name.

---

## 🎯 Why Use Advance-Tab-Saver?

Managing too many open tabs can be frustrating.  
This extension helps you:

- Save your current tabs as sessions and reopen them later.  
- Keep your browser clean and organized.  
- Avoid losing your open tabs after restarting or crashing.  
- Stay focused and productive.

---

## 🔮 Future Improvements

- [ ] Auto-backup saved tabs/sessions to local disk on a periodic schedule.
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
