# Changelog

All notable changes to this project will be documented in this file.

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
