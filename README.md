# Advance-Tab-Saver

**Advance Tab Saver** is a lightweight and efficient Chrome extension that helps you save, organize, and restore your browser tabs easily. It’s designed to boost productivity by preventing tab clutter and letting you quickly reopen saved sessions with just one click.

[![GitHub Release](https://img.shields.io/github/v/release/kronpatel/Advance-Tab-Saver?style=for-the-badge)](https://github.com/kronpatel/Advance-Tab-Saver/releases/latest)
[![GitHub Stars](https://img.shields.io/github/stars/kronpatel/Advance-Tab-Saver?style=for-the-badge)](https://github.com/kronpatel/Advance-Tab-Saver/stargazers)
[![Coming Soon on Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-blue?logo=google-chrome&style=for-the-badge)](#)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

# Advance Tab Saver
...
See the [Changelog](./CHANGELOG.md) for release notes.


---

## 🚀 Features

- Save one or multiple browser tabs as a session.  
- View and restore your saved sessions from the popup menu.  
- Simple and clean UI for quick access.  
- Fast and lightweight — no unnecessary dependencies.  
- Built using standard Chrome extension technologies (HTML, CSS, JS).

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

- [ ] Add the ability to name and categorize sessions.  
- [✅} Sync sessions across devices.  
- [✅] Export and import saved sessions (e.g., JSON format).  
- [✅] Add dark mode and UI customization.  
- [✅] Cross-browser support (Firefox, Edge).

---

## 🤝 Contributing

Contributions are always welcome!  
To contribute:
1. Fork this repository.  
2. Create a new branch (`feature/your-feature-name`).  
3. Make your changes and commit them.  
4. Submit a Pull Request with a clear description of your update.

---

### 💡 Author
---
Developed by [@kronpatel](https://github.com/kronpatel)  
Made with ❤️ for productivity and better tab management.
