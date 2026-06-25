# Contributing to Tab Saver Pro

We welcome contributions of all kinds! Please read these guidelines before submitting a pull request.

## Development Setup

Tab Saver Pro is a local, offline-first web extension written in vanilla JavaScript, HTML5, and CSS3. It does not require any build tools, compilers, or packers.

1. **Fork the Repository**: Create a fork of the repository on GitHub.
2. **Clone Locally**: Clone your fork to your local development environment:
   ```bash
   git clone https://github.com/your-username/Advance-Tab-Saver.git
   ```
3. **Load Unpacked in Chrome**:
   - Navigate to `chrome://extensions/`
   - Toggle **Developer Mode** on.
   - Click **Load Unpacked** and select your cloned project directory.
4. **Load Temporary Add-on in Firefox**:
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click **Load Temporary Add-on...**
   - Rename `manifest.firefox.json` to `manifest.json` temporarily to load in Firefox.

## Coding Style & Conventions

- **Vanilla JS**: Do not use any external frameworks (React, Vue, jQuery). Stick to standard DOM APIs.
- **Strict Protocol Whitelisting**: Any URL handling or opening must be validated using `TSP.isValidUrl()` to ensure only `http:`, `https:`, `file:`, or `about:blank` are permitted.
- **XSS Prevention**: Never bind user-controlled input strings to `innerHTML`. Use `textContent` or `document.createElement()` nodes.
- **Explicit Transitions**: Avoid generic `transition: all` CSS rules. Declare exact properties (e.g. `transition: background-color 0.15s ease`).
- **Tab Stacking Order**: Ensure custom overlays use a documented z-index mapping (e.g., standard dialogs at `z-index: 999`, custom confirm modals at `z-index: 1000`).

## Pull Request Guidelines

1. **Create a Branch**: branch names should follow the standard pattern `feature/your-feature-name` or `bugfix/issue-description`.
2. **Synchronize Versions**: Ensure the code compiles cleanly and manifest versions match the target release.
3. **Commit Messages**: Follow standard conventional commits guidelines:
   - `feat: add star favorites button`
   - `fix: resolve background worker cold start`
   - `docs: update readme guidelines`
4. **Submit PR**: Target the main repository `main` branch. Provide a detailed summary of changes and browser check outcomes.

## Browser Compatibility

Any code changes must be tested across both target platforms:
- **Google Chrome**: Compliant with Manifest V3 Service Worker limits.
- **Mozilla Firefox**: Compliant with Firefox Manifest V3 background scripts event-page lifecycles.
