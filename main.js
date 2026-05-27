const { app, globalShortcut, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

// 导入日志管理器
const LogManager = require("./src/helpers/logManager");

// 初始化日志管理器
const logger = new LogManager();

// 添加全局错误处理
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  if (error.code === "EPIPE") {
    return;
  }
  logger.error("Error stack:", error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { promise, reason });
});

// 导入助手模块
const EnvironmentManager = require("./src/helpers/environment");
const WindowManager = require("./src/helpers/windowManager");
const DatabaseManager = require("./src/helpers/database");
const ClipboardManager = require("./src/helpers/clipboard");
const AliyunASRManager = require("./src/helpers/aliyunASRManager");
const TrayManager = require("./src/helpers/tray");
const HotkeyManager = require("./src/helpers/hotkeyManager");
const IPCHandlers = require("./src/helpers/ipcHandlers");

// 设置应用名称和ID (Windows上用于任务栏分组和通知)
app.setName('Voke');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.voke.app');
}

// 初始化管理器
const environmentManager = new EnvironmentManager();
const windowManager = new WindowManager();
const databaseManager = new DatabaseManager();
const clipboardManager = new ClipboardManager(logger); // 传递logger实例
const aliyunASRManager = new AliyunASRManager(logger); // 传递logger实例
const trayManager = new TrayManager();
const hotkeyManager = new HotkeyManager();

// 设置WindowManager的依赖
windowManager.setDatabaseManager(databaseManager);

// 初始化数据库
const dataDirectory = environmentManager.ensureDataDirectory();
databaseManager.initialize(dataDirectory);

// 使用所有管理器初始化IPC处理器
const ipcHandlers = new IPCHandlers({
  environmentManager,
  databaseManager,
  clipboardManager,
  aliyunASRManager,
  windowManager,
  hotkeyManager,
  logger, // 传递logger实例
});

// 主应用启动函数
async function startApp() {
  logger.info('应用启动开始', {
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    appVersion: app.getVersion()
  });

  // 注释掉 accessibility 支持 - 可能干扰文本插入
  // try {
  //   app.setAccessibilitySupportEnabled(true);
  //   logger.info('✅ 已启用 Electron accessibility 支持');
  // } catch (error) {
  //   logger.warn('⚠️ 启用 accessibility 支持失败:', error.message);
  // }

  // 记录系统信息
  logger.info('系统信息', logger.getSystemInfo());

  // 开发模式下添加小延迟让Vite正确启动
  if (process.env.NODE_ENV === "development") {
    logger.info('开发模式，等待Vite启动...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // 确保macOS上dock可见
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show();
    logger.info('macOS Dock已显示');
  }

  // 阿里云ASR不需要启动初始化，只在调用时运行
  logger.info('阿里云ASR管理器已准备就绪');

  // 创建主窗口
  try {
    logger.info('创建主窗口...');
    await windowManager.createMainWindow();
    await windowManager.createOverlayWindow(); // 初始化 overlay 窗口
    logger.info('主窗口创建成功');
  } catch (error) {
    logger.error("创建主窗口时出错:", error);
  }

  // 设置托盘
  logger.info('设置系统托盘...');
  trayManager.setWindows(
    windowManager.mainWindow,
    windowManager.controlPanelWindow
  );
  trayManager.setCreateControlPanelCallback(() =>
    windowManager.createControlPanelWindow()
  );
  await trayManager.createTray();
  logger.info('系统托盘设置完成');

  logger.info('应用启动完成');
}

// 应用事件处理器
app.whenReady().then(() => {
  startApp();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow();
  }
});

app.on("before-quit", () => {
  windowManager.setQuitting(true);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// 导出管理器供其他模块使用
module.exports = {
  environmentManager,
  windowManager,
  databaseManager,
  clipboardManager,
  aliyunASRManager,
  trayManager,
  hotkeyManager,
  logger
};
