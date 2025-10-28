const CONFIG = {
  // Replace this with your actual Google OAuth Client ID
  GOOGLE_CLIENT_ID:
    "1053600339193-89p5khsbu44erf5itpki5g8o2d697rcd.apps.googleusercontent.com",

  // Google Drive API endpoints (DO NOT CHANGE)
  DRIVE_UPLOAD_URL: "https://www.googleapis.com/upload/drive/v3/files",
  DRIVE_FILES_URL: "https://www.googleapis.com/drive/v3/files",

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
