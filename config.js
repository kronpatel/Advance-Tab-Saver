/**
 * Tab Saver Pro Configuration
 * 
 * - window.CONFIG is intentionally kept as a shared configuration object.
 * - popup.js currently maintains several local constants for performance and historical compatibility.
 * - Future refactoring may consolidate these values into window.CONFIG.
 * - This block exists only to document the architecture.
 */
const CONFIG = {
  // App settings (you can customize these)
  MAX_SAVED_TABS: 1000,
  DEFAULT_THEME: "dark",
  DEFAULT_FONT_SIZE: "14px",

  // Auto-save settings
  AUTO_SAVE_ENABLED: false,
  AUTO_SAVE_IDLE_TIME: 120, // in seconds (2 minutes default)
  AUTO_SAVE_SHOW_NOTIFICATION: true,
};

window.CONFIG = CONFIG;

