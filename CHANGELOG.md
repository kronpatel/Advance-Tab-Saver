# Changelog

All notable changes to this project will be documented in this file.

## [3.2.0] - 2026-06-26

### Added
- Native Firefox MV3 Support (includes distinct `manifest.firefox.json` background script bindings and Gecko compatibility specifications).
- Reduced Motion Accessibility Support (disables all spring scale transitions and animations when OS pref is active).
- Sleek Custom Confirmation Modal Overlays (features slate styling, WebKit-prefixed 8px backdrop blur, keyboard navigation trap, and z-index 1000 dialog layering).
- Standard repository metadata files (`SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `PRIVACY.md`).
- Architectural configuration documentation inside [config.js](config.js).

### Improved
- Repository `.gitignore` rules (comprehensively excludes temporary log, IDE, and OS metadata files).
- GitHub Pages landing page [index.html](index.html) (adds SEO/OpenGraph tags, theme responsiveness, mobile spacing improvements, and favicon support).

## [3.1.0] - 2026-06-17

### Added
- Automatic Backup System (daily and weekly automated database backups).
- Backup Retention Management (automatically prunes old files based on configuration limits of 5, 10, or 20).
- Manual Backup Creation (instant "Create Backup Now" trigger in settings).
- Backup Restore Support (overwriting active tabs/sessions dynamically).
- Recently Saved Widget (statistics panel showing latest bookmarks with copy/restore/delete buttons).
- Restore Preview Dialog (side-by-side database metric comparisons before confirming restore).
- Experimental Firefox Support (including manual debugging/installation instructions).
- Separate Firefox manifest (`manifest.firefox.json` with background scripts and Gecko settings).

### Improved
- Auto Save Reliability (optimized idle state listener for Manifest V3).
- URL Normalization Logic (strips tracking parameters, matching trailing slashes, and ignores case).

### Fixed
- Manifest V3 background service worker cold start issues and message delivery.
- Inconsistent duplicate detection checks.
- Chrome MV3 background scripts warning (`background.scripts` validation issue resolved).

## [3.0.0] - 2026-06-12

### Added
- Favorites System (star toggle ☆ / ★ with prioritized list at top).
- Bulk Selection Actions (Select All, bulk Open, bulk Export, bulk Delete).
- Duplicate Tab Detection & safe removal (preserving oldest entry).
- Storage Dashboard (2x2 analytics metrics tracking counts and byte size).
- Session Categories (Work, Project, Study, Personal, Custom).
- Save All Mode Selection (modal dialogue to select Individual Tabs vs. Session mode).

### Improved
- Premium UI Redesign (SaaS dashboard styling, modern fonts, card design).
- Session Cards (sub-row metadata with calendar/tab icon layout).
- Tab Cards (truncated URL display below title, responsive layout).
- Statistics Dashboard (interactive storage maintenance panels).
- Theme System (calibrated contrast across Dark, Light, and Grey layouts).

### Fixed
- Import / Export Format Mismatch (full JSON data validation & merger support).
- Storage Sync Quota Issue (transitioned saved tabs and sessions to `chrome.storage.local`).
- Session Restore Reliability (async opening handled correctly in background service worker).
- XSS Vulnerability (escaped HTML outputs across elements).
- Modal Theme Issues (matched settings and session dialog surfaces to active theme).
- CSS Transition Performance Issues (replaced `transition: all` with explicit property mappings).

### Removed
- Google Sign-In (simplified offline-first setup).
- Google Drive Sync (removed OAuth constraints & client configurations).
- OAuth Configuration & External Cloud Dependencies.

## [1.2.0] - 2025-11-05
### Added
- Initial public preview of Advance Tab Saver.
- Save current window tabs as a named session.
- Restore saved sessions (open all tabs).
- Delete sessions from the list.
- Basic popup UI and icon set.

### Notes
- This is an early preview. Expect rapid iterations.
