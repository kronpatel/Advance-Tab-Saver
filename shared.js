// Tab Saver Pro — Shared Utilities (shared.js)
// Copyright (c) 2025-2026 KERZOX. All rights reserved.
//
// Exposes window.TSP (frozen Object) — the single canonical implementation
// of all utility functions shared across the popup layer.
//
// Load order in popup.html:  shared.js → config.js → popup.js
//
// NOTE: background.js (service worker) cannot load this file. It maintains
// its own minimal inline copies of isValidUrl / normalizeUrl / sanitizeTabData
// for MV3 service-worker compatibility.

(function () {
  "use strict";

  // ── Default favicon (safe inline SVG data URL) ──────────────────────────
  const DEFAULT_FAVICON =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ddd"/></svg>';

  // ── escapeHTML ───────────────────────────────────────────────────────────
  // Escapes all HTML special characters to prevent XSS when injecting
  // user-controlled strings into innerHTML or attribute values.
  function escapeHTML(str) {
    if (typeof str !== "string") return "";
    return str.replace(
      /[&<>'"]/g,
      (tag) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        }[tag] || tag)
    );
  }

  // ── normalizeUrl ─────────────────────────────────────────────────────────
  // Canonical URL normalizer used for robust duplicate detection.
  // Strips tracking parameters (utm_*, ref), removes trailing slashes,
  // and preserves hash/search for all other query parameters.
  function normalizeUrl(urlStr) {
    if (!urlStr || typeof urlStr !== "string") return "";
    try {
      const url = new URL(urlStr);
      let pathname = url.pathname;
      if (pathname.endsWith("/") && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
      }
      const params = new URLSearchParams(url.search);
      const trackingParams = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "ref",
      ];
      let changed = false;
      trackingParams.forEach((param) => {
        if (params.has(param)) {
          params.delete(param);
          changed = true;
        }
      });
      const search = changed
        ? params.toString()
          ? "?" + params.toString()
          : ""
        : url.search;
      return `${url.protocol}//${url.hostname}${
        url.port ? ":" + url.port : ""
      }${pathname}${search}${url.hash}`;
    } catch (_) {
      let cleaned = urlStr.trim();
      if (cleaned.endsWith("/") && cleaned.length > 1) {
        cleaned = cleaned.slice(0, -1);
      }
      return cleaned;
    }
  }

  // ── isValidUrl ───────────────────────────────────────────────────────────
  // Strict protocol whitelist — only allows http, https, file, about:blank.
  // All other protocols (javascript:, data:, blob:, chrome:, moz-extension:)
  // are blocked.
  function isValidUrl(string) {
    if (!string || typeof string !== "string") return false;
    try {
      const url = new URL(string);
      if (url.protocol === "http:" || url.protocol === "https:") return true;
      if (url.protocol === "file:") return true;
      if (url.protocol === "about:") return url.href === "about:blank";
      return false;
    } catch (_) {
      return false;
    }
  }

  // ── isValidFaviconUrl ────────────────────────────────────────────────────
  // Validates that a favicon URL is safe to use as an <img> src attribute.
  // Allowed: https://, http://, data:image/* (inline images only).
  // Blocked: javascript:, data:text/html, blob:, anything else.
  //
  // This prevents attribute injection and SVG-based XSS when favicon values
  // come from imported JSON files or restored backups.
  function isValidFaviconUrl(url) {
    if (!url || typeof url !== "string") return false;
    // Allow safe inline image data URLs only (not data:text/html etc.)
    if (url.startsWith("data:image/")) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch (_) {
      return false;
    }
  }

  // ── checkFileSchemeAccess ────────────────────────────────────────────────
  // Detects whether the extension has been granted access to file:// URLs.
  // Falls back to false in standalone/preview mode or unsupported browsers.
  function checkFileSchemeAccess(callback) {
    try {
      const extAPI =
        typeof chrome !== "undefined"
          ? chrome
          : typeof browser !== "undefined"
          ? browser
          : null;
      if (
        extAPI &&
        extAPI.extension &&
        typeof extAPI.extension.isAllowedFileSchemeAccess === "function"
      ) {
        extAPI.extension.isAllowedFileSchemeAccess((isAllowed) => {
          callback(!!isAllowed);
        });
      } else {
        callback(false);
      }
    } catch (e) {
      console.error("TSP: Error checking file scheme access:", e);
      callback(false);
    }
  }

  // ── sanitizeTabData ──────────────────────────────────────────────────────
  // Canonical tab sanitizer. Accepts raw Chrome tab objects or stored objects.
  // Returns a clean, safe object with all fields validated — or null if
  // the tab is fundamentally invalid (bad URL, missing title, etc.).
  //
  // This is the authoritative version (superset of background.js version):
  // includes category and favorite fields.
  function sanitizeTabData(tab) {
    if (!tab) return null;

    // ── Favicon validation ──────────────────────────────────────────────
    let favicon = tab.favicon || tab.favIconUrl || "";
    if (!isValidFaviconUrl(favicon)) {
      // Attempt Google favicon service for http/https tabs
      if (tab.url) {
        try {
          const urlObj = new URL(tab.url);
          if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
            favicon =
              "https://www.google.com/s2/favicons?domain=" +
              encodeURIComponent(urlObj.hostname);
          } else {
            favicon = DEFAULT_FAVICON;
          }
        } catch (_) {
          favicon = DEFAULT_FAVICON;
        }
      } else {
        favicon = DEFAULT_FAVICON;
      }
    }

    // ── Build sanitized object ──────────────────────────────────────────
    const sanitized = {
      title: String(tab.title || "Untitled").slice(0, 500),
      url: String(tab.url || "").slice(0, 2048),
      favicon,
      savedAt: typeof tab.savedAt === "number" ? tab.savedAt : Date.now(),
      category:
        tab.category && typeof tab.category === "string"
          ? tab.category.slice(0, 100)
          : undefined,
      favorite: tab.favorite === true,
    };

    // ── Structural validation ───────────────────────────────────────────
    if (!sanitized.url || !isValidUrl(sanitized.url)) return null;
    if (!sanitized.title || sanitized.title.trim().length === 0) return null;
    if (sanitized.url.length > 2048) return null;

    return sanitized;
  }

  // ── Freeze and expose ────────────────────────────────────────────────────
  // Object.freeze prevents accidental or malicious runtime modification of
  // the shared utilities namespace.
  window.TSP = Object.freeze({
    DEFAULT_FAVICON,
    escapeHTML,
    normalizeUrl,
    isValidUrl,
    isValidFaviconUrl,
    checkFileSchemeAccess,
    sanitizeTabData,
  });
})();
