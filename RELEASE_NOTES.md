# Tab Saver Pro v3.2.0 — Production Hardening & Cross-Browser Stability

## 🚀 Short GitHub Release Summary

Tab Saver Pro v3.2.0 is a major quality-of-life and stability release focusing on production hardening, native Firefox MV3 support, OS accessibility preferences, custom modal overlay aesthetics, and comprehensive repository metadata documentation.

### Key Highlights:
- **Firefox MV3 Compatibility**: Native integration utilizing Gecko event page guidelines.
- **Accessibility Hardening**: OS-level reduced motion support (`prefers-reduced-motion: reduce`) and customized keyboard dialog focus traps.
- **Visual Polish**: Re-designed custom confirm modal layout with slate-glass overlays and 8px backdrop blur.
- **Community Compliance**: Added comprehensive `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `PRIVACY.md` documentation files.
- **No functional or breaking configuration changes.**

---

## 📋 Full Release Notes

### 🌟 New Features
- **🦊 Firefox MV3 Integration**: Implemented a standalone Gecko manifest configuration (`manifest.firefox.json`) mapping event-driven background scripts and permissions schemas directly matching Firefox WebExtensions requirements.
- **♿ Reduced Motion Preferences**: Implemented a `@media (prefers-reduced-motion: reduce)` media query that instantly deactivates all spring bounce scales, slide transitions, and overlay fade animations.

### 🔧 Improvements
- **🛡️ Custom Modal Styling**: Polished the confirmation dialog overlay with:
  - Deep slate background tint (`rgba(15, 23, 42, 0.65)`) ensuring readable contrast.
  - WebKit-compatible backdrop blur parameters (`blur(8px)`).
  - Explicit stacking order (`z-index: 1000`) sitting predictably one level above standard dialog containers (`999`).
- **🔒 Community & Privacy Files**: Added:
  - `PRIVACY.md` detailing local-only, offline-first structures (no analytics, no telemetry, no tracking) and manifest permission profiles.
  - `SECURITY.md` defining private vulnerability report guidelines (email) and 48-hour triage response terms.
  - `CONTRIBUTING.md` outlining project guidelines, commit structures, and coding rules.
  - `CODE_OF_CONDUCT.md` using the Contributor Covenant v2.1.
- **📘 Code Architecture Documentation**: Added inline comments to `config.js` explaining the shared config namespace structure and future consolidation plans.

### 🛡️ Security
- Fully verified data-bound inputs (`textContent` and dynamic element node generation) preventing XSS vulnerabilities.
- Strict whitelisting protocols restricted to `http:`, `https:`, `file:`, and `about:blank`.
- Hard file-size validation threshold of `10MB` on user backup imports.
- Background worker checks validate message sender origins:
  ```javascript
  if (!sender || sender.id !== chrome.runtime.id) return false;
  ```

### ⚡ Performance
- Consolidated duplicate tab detection into an efficient Set-based query lookup offering `O(N)` algorithmic linear check complexity.
- Avoided layout thrashing by reading dashboard metrics directly from memory caches.
- Implemented loop-breaker lock switches (`_syncMirrorInProgress`) to prevent synchronization echo cycles between local and cloud storage profiles.

### ♿ Accessibility
- Modal dialogue elements use correct ARIA properties (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`).
- Implemented focus captures trapping navigation actions strictly inside active overlays, caching target sources to return focus accurately on dismissal.
- Tailored `:focus-visible` indicators to draw distinct outline glows matching context button colors.

### 🐛 Bug Fixes
- Fixed Manifest V3 background service worker cold start issues and message delivery.
- Fixed inconsistent duplicate detection checks.
- Resolved Chrome MV3 background scripts warning (`background.scripts` validation issue resolved).
- Resolved infinite write loop echo cycles in settings storage reconciliation.

### 🛠️ Upgrade Notes
1. For Chrome: Reload the extension on `chrome://extensions`.
2. For Firefox: Reload the temporary add-on on `about:debugging`.

### 👥 Credits
- Developed by [@kronpatel](https://github.com/kronpatel)
- Made with ❤️ for clean interfaces and tab hygiene.
