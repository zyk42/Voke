const { BrowserWindow } = require("electron");
const path = require("path");

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.overlayWindow = null;
    this.controlPanelWindow = null;
    this.historyWindow = null;
    this.settingsWindow = null;
    this.isQuitting = false;
  }

  setQuitting(isQuitting) {
    this.isQuitting = isQuitting;
  }

  async createMainWindow() {
    if (this.mainWindow) {
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const isDev = process.env.NODE_ENV === "development";
    const iconPath = path.join(__dirname, "..", "..", "assets", "icon.png");

    this.mainWindow = new BrowserWindow({
      width: 900,
      height: 600,
      icon: iconPath,
      frame: false, // Keep frameless for custom UI
      transparent: true, // Keep transparent for rounded corners if needed, but watch out for glitches
      alwaysOnTop: false, // Default to false for main app window
      resizable: true,
      skipTaskbar: false, // Show in taskbar
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "..", "..", "preload.js"),
      },
    });

    if (isDev) {
      await this.mainWindow.loadURL("http://localhost:5173");
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    }

    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    // Listen for maximize/unmaximize events
    this.mainWindow.on('maximize', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('window-maximized');
      }
    });

    this.mainWindow.on('unmaximize', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('window-unmaximized');
      }
    });

    return this.mainWindow;
  }

  async createOverlayWindow() {
    if (this.overlayWindow) {
      return this.overlayWindow;
    }

    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const winWidth = 400;
    const winHeight = 120;

    this.overlayWindow = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x: Math.round((width - winWidth) / 2),
      y: height - winHeight - 100,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      focusable: false,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "..", "..", "preload.js"),
      },
    });
    
    this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });

    const isDev = process.env.NODE_ENV === "development";
    // 使用 loadURL 并在 URL 中包含 query 参数
    const url = isDev 
      ? "http://localhost:5173?mode=overlay" 
      : `file://${path.join(__dirname, "..", "dist", "index.html")}?mode=overlay`;

    await this.overlayWindow.loadURL(url);

    this.overlayWindow.on("closed", () => {
      this.overlayWindow = null;
    });

    return this.overlayWindow;
  }

  // Unified method to handle navigation
  async navigateTo(tabId) {
    if (!this.mainWindow) {
      await this.createMainWindow();
    }
    
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }
    this.mainWindow.show();
    this.mainWindow.focus();
    
    // Send navigation event to renderer
    this.mainWindow.webContents.send('navigate-to', tabId);
  }

  async createControlPanelWindow() {
    return this.navigateTo('settings');
  }

  async createHistoryWindow() {
    return this.navigateTo('history');
  }

  async createSettingsWindow() {
    return this.navigateTo('settings');
  }

  showControlPanel() {
    return this.navigateTo('settings');
  }

  hideControlPanel() {
    // No-op or hide main window if desired, but usually we just stay on the page
  }

  showHistoryWindow() {
    return this.navigateTo('history');
  }

  hideHistoryWindow() {
    // No-op
  }

  closeHistoryWindow() {
    // No-op
  }

  showSettingsWindow() {
    return this.navigateTo('settings');
  }

  hideSettingsWindow() {
    // No-op
  }

  closeSettingsWindow() {
    // No-op
  }

  closeAllWindows() {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }
}

module.exports = WindowManager;