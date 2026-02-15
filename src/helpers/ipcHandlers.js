const { ipcMain } = require("electron");
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

class IPCHandlers {
  constructor(managers) {
    this.environmentManager = managers.environmentManager;
    this.databaseManager = managers.databaseManager;
    this.clipboardManager = managers.clipboardManager;
    this.aliyunASRManager = managers.aliyunASRManager;
    this.windowManager = managers.windowManager;
    this.hotkeyManager = managers.hotkeyManager;
    this.logger = managers.logger; // 添加logger引用
    
    this.setupHandlers();
  }

  setupHandlers() {
    // 环境和配置相关
    ipcMain.handle("get-config", () => {
      return this.environmentManager.exportConfig();
    });

    ipcMain.handle("validate-environment", () => {
      return this.environmentManager.validateEnvironment();
    });

    // 录音相关
    ipcMain.handle("start-recording", async () => {
      // TODO: 实现录音开始功能
      return { success: true };
    });

    ipcMain.handle("stop-recording", async () => {
      // TODO: 实现录音停止功能
      return { success: true };
    });

    // AI文本处理
    ipcMain.handle("process-text", async (event, text, mode = 'optimize', selectedText = null) => {
      return await this.processTextWithAI(text, mode, selectedText);
    });

    ipcMain.handle("check-ai-status", async (event, testConfig = null) => {
      return await this.checkAIStatus(testConfig);
    });

    // 音频转录相关
    ipcMain.handle("transcribe-audio", async (event, audioData, options) => {
      let tempFilePath = null;
      try {
        // 前端传递的是 Uint8Array 数据流，需要先保存为临时文件
        const tempDir = os.tmpdir();
        const fileName = `audio_${Date.now()}_${uuidv4()}.wav`;
        tempFilePath = path.join(tempDir, fileName);
        
        this.logger.info("Writing temporary audio file", { tempFilePath });
        
        // 将 Uint8Array 转换为 Buffer
        const buffer = Buffer.from(audioData);
        fs.writeFileSync(tempFilePath, buffer);
        
        // 获取 ASR 配置
        const asrApiKey = await this.databaseManager.getSetting('asr_api_key');
        if (!asrApiKey) {
          throw new Error('请先在设置页面配置 ASR API 密钥');
        }
        const asrBaseUrl = await this.databaseManager.getSetting('asr_base_url');
        const asrModel = await this.databaseManager.getSetting('asr_model') || 'qwen3-asr-flash';
        
        this.logger.info("Calling Aliyun ASR", { audioPath: tempFilePath, model: asrModel, baseUrl: asrBaseUrl });
        
        const text = await this.aliyunASRManager.transcribe(tempFilePath, {
          apiKey: asrApiKey,
          baseUrl: asrBaseUrl,
          model: asrModel
        });
        
        // 清理临时文件
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          this.logger.warn("Failed to delete temp file", { tempFilePath, error: cleanupError.message });
        }
        
        return { success: true, text: text, raw_text: text };
      } catch (error) {
        this.logger.error("Aliyun ASR failed", error);
        
        // 确保发生错误时也清理临时文件
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            // ignore
          }
        }
        
        return { success: false, error: error.message };
      }
    });



    // 数据库相关
    ipcMain.handle("save-transcription", (event, data) => {
      return this.databaseManager.saveTranscription(data);
    });

    ipcMain.handle("get-transcriptions", (event, limit, offset) => {
      return this.databaseManager.getTranscriptions(limit, offset);
    });

    ipcMain.handle("get-transcription", (event, id) => {
      return this.databaseManager.getTranscriptionById(id);
    });

    ipcMain.handle("delete-transcription", (event, id) => {
      return this.databaseManager.deleteTranscription(id);
    });

    ipcMain.handle("search-transcriptions", (event, query, limit) => {
      return this.databaseManager.searchTranscriptions(query, limit);
    });

    ipcMain.handle("get-transcription-stats", () => {
      return this.databaseManager.getTranscriptionStats();
    });

    ipcMain.handle("get-statistics", () => {
      return this.databaseManager.getTranscriptionStats();
    });

    ipcMain.handle("clear-all-transcriptions", () => {
      return this.databaseManager.clearAllTranscriptions();
    });

    // 设置相关
    ipcMain.handle("get-setting", (event, key, defaultValue) => {
      return this.databaseManager.getSetting(key, defaultValue);
    });

    ipcMain.handle("set-setting", (event, key, value) => {
      return this.databaseManager.setSetting(key, value);
    });

    ipcMain.handle("get-all-settings", () => {
      return this.databaseManager.getAllSettings();
    });

    ipcMain.handle("get-settings", () => {
      return this.databaseManager.getAllSettings();
    });

    ipcMain.handle("save-setting", (event, key, value) => {
      return this.databaseManager.setSetting(key, value);
    });

    ipcMain.handle("reset-settings", () => {
      // TODO: 实现重置设置功能
      return this.databaseManager.resetSettings();
    });

    // 剪贴板相关
    ipcMain.handle("copy-text", async (event, text) => {
      try {
        return await this.clipboardManager.copyText(text);
      } catch (error) {
        this.logger.error("复制文本失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("paste-text", async (event, text) => {
      return this.clipboardManager.pasteText(text);
    });

    ipcMain.handle("insert-text-directly", async (event, text) => {
      try {
        return await this.clipboardManager.insertTextDirectly(text);
      } catch (error) {
        this.logger.error("直接插入文本失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("enable-macos-accessibility", async () => {
      try {
        if (process.platform === "darwin") {
          const result = await this.clipboardManager.enableMacOSAccessibility();
          return { success: result };
        }
        return { success: true, message: "非 macOS 平台，无需设置" };
      } catch (error) {
        this.logger.error("启用 macOS accessibility 失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("read-clipboard", async () => {
      try {
        const text = await this.clipboardManager.readClipboard();
        return { success: true, text };
      } catch (error) {
        this.logger.error("读取剪贴板失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("get-selected-text", async () => {
      try {
        const text = await this.clipboardManager.getSelectedText();
        return text;
      } catch (error) {
        this.logger.error("获取选中项文本失败:", error);
        return "";
      }
    });

    ipcMain.handle("write-clipboard", async (event, text) => {
      try {
        return await this.clipboardManager.writeClipboard(text);
      } catch (error) {
        this.logger.error("写入剪贴板失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("get-clipboard-history", () => {
      // TODO: 实现剪贴板历史功能
      return [];
    });

    ipcMain.handle("clear-clipboard-history", () => {
      // TODO: 实现清除剪贴板历史功能
      return true;
    });

    // 窗口管理相关
    ipcMain.handle("hide-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.hide();
      }
      return true;
    });

    ipcMain.handle("show-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.show();
      }
      return true;
    });

    ipcMain.handle("minimize-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.minimize();
      }
      return true;
    });

    ipcMain.handle("maximize-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.maximize();
      }
      return true;
    });

    ipcMain.handle("unmaximize-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.unmaximize();
      }
      return true;
    });

    ipcMain.handle("is-window-maximized", () => {
      if (this.windowManager.mainWindow) {
        return this.windowManager.mainWindow.isMaximized();
      }
      return false;
    });

    ipcMain.handle("close-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.close();
      }
      return true;
    });

    ipcMain.handle("show-control-panel", () => {
      this.windowManager.showControlPanel();
      return true;
    });

    ipcMain.handle("hide-control-panel", () => {
      this.windowManager.hideControlPanel();
      return true;
    });

    ipcMain.handle("open-control-panel", () => {
      this.windowManager.showControlPanel();
      return true;
    });

    ipcMain.handle("close-control-panel", () => {
      this.windowManager.hideControlPanel();
      return true;
    });

    ipcMain.handle("open-history-window", () => {
      this.windowManager.showHistoryWindow();
      return true;
    });

    ipcMain.handle("close-history-window", () => {
      this.windowManager.closeHistoryWindow();
      return true;
    });

    ipcMain.handle("hide-history-window", () => {
      this.windowManager.hideHistoryWindow();
      return true;
    });

    ipcMain.handle("open-settings-window", () => {
      this.windowManager.showSettingsWindow();
      return true;
    });

    ipcMain.handle("close-settings-window", () => {
      this.windowManager.closeSettingsWindow();
      return true;
    });

    ipcMain.handle("hide-settings-window", () => {
      this.windowManager.hideSettingsWindow();
      return true;
    });

    ipcMain.handle("close-app", () => {
      require("electron").app.quit();
    });

    // 热键管理 - 添加发送者跟踪机制
    this.hotkeyRegisteredSenders = new Map(); // 跟踪已注册热键的发送者: senderId -> Set<hotkey>
    
    ipcMain.handle("register-hotkey", (event, hotkey) => {
      try {
        if (this.hotkeyManager) {
          const senderId = event.sender.id;
          
          // 初始化该发送者的热键集合
          if (!this.hotkeyRegisteredSenders.has(senderId)) {
            this.hotkeyRegisteredSenders.set(senderId, new Set());
          }
          const senderHotkeys = this.hotkeyRegisteredSenders.get(senderId);

          // 检查是否已经为这个发送者注册过该热键
          if (senderHotkeys.has(hotkey)) {
            this.logger.debug(`发送者 ${senderId} 已注册过热键 ${hotkey}，跳过重复注册`);
            return { success: true };
          }
          
          const success = this.hotkeyManager.registerHotkey(hotkey, (action) => {
            // 只发送热键触发事件到主窗口，避免重复触发
            this.logger.info(`热键 ${hotkey} 被触发 (${action || 'click'})，发送事件到主窗口`);
            
            // 立即响应UI - 在主进程直接控制Overlay窗口，减少IPC往返延迟
            try {
              const isRecording = this.hotkeyManager.getRecordingState();
              if (this.windowManager.overlayWindow && !this.windowManager.overlayWindow.isDestroyed()) {
                // 如果是按下事件（或点击），且未录音，显示波纹
                if ((!action || action === 'down') && !isRecording) {
                  this.windowManager.overlayWindow.showInactive();
                }
              }
              
              // Find main window and send event
              if (this.windowManager.mainWindow && !this.windowManager.mainWindow.isDestroyed()) {
                if ((hotkey === 'RightAlt' || hotkey === 'RightControl') && action) {
                  // Right Alt 和 Right Control 区分按下和松开
                  if (action === 'down') {
                    this.windowManager.mainWindow.webContents.send("hotkey-pressed", hotkey);
                  } else if (action === 'up') {
                    this.windowManager.mainWindow.webContents.send("hotkey-released", hotkey);
                  }
                } else {
                  // 其他热键保持原有的触发行为 (Toggle)
                  this.windowManager.mainWindow.webContents.send("hotkey-triggered");
                }
              }
            } catch (err) {
              this.logger.error("处理热键回调失败:", err);
            }
          });
          
          if (success) {
            // 添加热键到该发送者的跟踪列表
            senderHotkeys.add(hotkey);
            
            // 监听窗口关闭事件，清理注册记录 (仅在第一次注册时添加监听器)
            if (senderHotkeys.size === 1) {
              event.sender.on('destroyed', () => {
                this.hotkeyRegisteredSenders.delete(senderId);
                this.logger.info(`清理发送者 ${senderId} 的热键注册记录`);
              });
            }
            
            this.logger.info(`热键 ${hotkey} 注册成功，发送者: ${senderId}`);
          } else {
            this.logger.error(`热键 ${hotkey} 注册失败`);
          }
          
          return { success };
        }
        return { success: false, error: "热键管理器未初始化" };
      } catch (error) {
        this.logger.error("注册热键失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("unregister-hotkey", (event, hotkey) => {
      try {
        if (this.hotkeyManager) {
          const success = this.hotkeyManager.unregisterHotkey(hotkey);
          return { success };
        }
        return { success: false, error: "热键管理器未初始化" };
      } catch (error) {
        this.logger.error("注销热键失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("get-current-hotkey", () => {
      try {
        if (this.hotkeyManager) {
          const hotkeys = this.hotkeyManager.getRegisteredHotkeys();
          // 返回第一个热键，或默认热键
          const mainHotkey = hotkeys.length > 0 ? hotkeys[0] : "CommandOrControl+Shift+Space";
          return mainHotkey;
        }
        return "CommandOrControl+Shift+Space";
      } catch (error) {
        this.logger.error("获取当前热键失败:", error);
        return "CommandOrControl+Shift+Space";
      }
    });

    ipcMain.handle("update-overlay-state", (event, state) => {
      try {
        if (this.windowManager.overlayWindow && !this.windowManager.overlayWindow.isDestroyed()) {
          if (state.mode === 'idle') {
            this.windowManager.overlayWindow.hide();
          } else {
            this.windowManager.overlayWindow.showInactive();
          }
          this.windowManager.overlayWindow.webContents.send("overlay-state-update", state);
        }
        return { success: true };
      } catch (error) {
        this.logger.error("更新Overlay状态失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("set-recording-state", (event, isRecording) => {
      try {
        if (this.hotkeyManager) {
          this.hotkeyManager.setRecordingState(isRecording);
          return { success: true };
        }
        return { success: false, error: "热键管理器未初始化" };
      } catch (error) {
        this.logger.error("设置录音状态失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("get-recording-state", () => {
      try {
        if (this.hotkeyManager) {
          const isRecording = this.hotkeyManager.getRecordingState();
          return { success: true, isRecording };
        }
        return { success: false, error: "热键管理器未初始化" };
      } catch (error) {
        this.logger.error("获取录音状态失败:", error);
        return { success: false, error: error.message };
      }
    });

    // 文件操作
    ipcMain.handle("export-transcriptions", async (event, format = 'json') => {
      try {
        const { dialog } = require('electron');
        const fs = require('fs');
        const path = require('path');

        // 强制使用 json 格式
        if (format !== 'json') {
          format = 'json';
        }

        // 获取所有转录记录
        const transcriptions = await this.databaseManager.getAllTranscriptions();
        
        if (!transcriptions || transcriptions.length === 0) {
          return { success: false, error: "没有可导出的记录" };
        }

        // 生成导出内容
        let content = "";
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, "-");
        
        // 仅支持 JSON 格式
        // 过滤不需要的字段
        const filteredTranscriptions = transcriptions.map(item => ({
          id: item.id,
          text: item.text,
          raw_text: item.raw_text,
          processed_text: item.processed_text,
          language: item.language,
          duration: item.duration,
          type: item.type || 'normal',
          word_count: item.word_count || 0,
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
        content = JSON.stringify(filteredTranscriptions, null, 2);

        // 选择保存路径
        const { filePath } = await dialog.showSaveDialog({
          title: '导出转录记录',
          defaultPath: `transcriptions_${timestamp}.json`,
          filters: [
            { name: 'JSON', extensions: ['json'] }
          ]
        });

        if (filePath) {
          fs.writeFileSync(filePath, content, 'utf-8');
          // 打开所在文件夹
          require("electron").shell.showItemInFolder(filePath);
          return { success: true, path: filePath };
        }
        
        return { success: false, error: "用户取消导出" };
      } catch (error) {
        this.logger.error("导出转录记录失败:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("import-settings", () => {
      // TODO: 实现导入设置功能
      return { success: true };
    });

    ipcMain.handle("export-settings", () => {
      // TODO: 实现导出设置功能
      return { success: true, path: "" };
    });

    // 文件系统相关
    ipcMain.handle("show-item-in-folder", (event, fullPath) => {
      require("electron").shell.showItemInFolder(fullPath);
    });

    ipcMain.handle("open-external", (event, url) => {
      require("electron").shell.openExternal(url);
    });

    // 系统信息
    ipcMain.handle("get-system-info", () => {
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
      };
    });

    ipcMain.handle("check-permissions", async () => {
      try {
        // 检查辅助功能权限
        const hasAccessibility = await this.clipboardManager.checkAccessibilityPermissions();
        
        return {
          microphone: true, // 麦克风权限由前端检查
          accessibility: hasAccessibility
        };
      } catch (error) {
        this.logger.error("检查权限失败:", error);
        return {
          microphone: false,
          accessibility: false,
          error: error.message
        };
      }
    });

    ipcMain.handle("request-permissions", async () => {
      try {
        // 对于辅助功能权限，我们只能引导用户手动授予
        // 这里可以打开系统设置页面
        if (process.platform === "darwin") {
          this.clipboardManager.openSystemSettings();
        }
        return { success: true };
      } catch (error) {
        this.logger.error("请求权限失败:", error);
        return { success: false, error: error.message };
      }
    });

    // 测试辅助功能权限
    ipcMain.handle("test-accessibility-permission", async () => {
      try {
        // 使用测试文本检查权限
        await this.clipboardManager.pasteText("TalkType权限测试");
        return { success: true, message: "辅助功能权限测试成功" };
      } catch (error) {
        this.logger.error("辅助功能权限测试失败:", error);
        return { success: false, error: error.message };
      }
    });

    // 打开系统权限设置
    ipcMain.handle("open-system-permissions", () => {
      try {
        if (process.platform === "darwin") {
          this.clipboardManager.openSystemSettings();
          return { success: true };
        } else {
          return { success: false, error: "当前平台不支持自动打开权限设置" };
        }
      } catch (error) {
        this.logger.error("打开系统权限设置失败:", error);
        return { success: false, error: error.message };
      }
    });

    // 应用信息
    ipcMain.handle("get-app-version", () => {
      return require("electron").app.getVersion();
    });

    ipcMain.handle("get-app-path", (event, name) => {
      return require("electron").app.getPath(name);
    });

    ipcMain.handle("check-for-updates", () => {
      // TODO: 实现更新检查功能
      return { hasUpdate: false };
    });

    // 调试和日志
    ipcMain.handle("log", (event, level, message, data) => {
      this.logger[level](`[渲染进程] ${message}`, data || "");
      return true;
    });

    ipcMain.handle("get-debug-info", () => {
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        appVersion: require("electron").app.getVersion()
      };
    });

    // 保持向后兼容性
    ipcMain.handle("log-message", (event, level, message, data) => {
      this.logger[level](`[渲染进程] ${message}`, data || "");
      return true;
    });

    // 中文特定功能
    ipcMain.handle("detect-language", (event, text) => {
      // TODO: 实现语言检测功能
      return { language: "zh-CN", confidence: 0.95 };
    });

    ipcMain.handle("segment-chinese", (event, text) => {
      // TODO: 实现中文分词功能
      return { segments: text.split("") };
    });

    ipcMain.handle("add-punctuation", (event, text) => {
      // TODO: 实现标点符号添加功能
      return { text: text };
    });

    // 音频处理
    ipcMain.handle("convert-audio-format", (event, audioData, targetFormat) => {
      // TODO: 实现音频格式转换功能
      return { success: true, data: audioData };
    });

    ipcMain.handle("enhance-audio", (event, audioData) => {
      // TODO: 实现音频增强功能
      return { success: true, data: audioData };
    });

    // 模型管理 - 仅保留API相关接口
    ipcMain.handle("get-available-models", () => {
      // 返回API支持的模型列表
      return {
        models: [
          { id: "qwen3-asr-flash", name: "Qwen3 ASR Flash (推荐)" },
          { id: "qwen3-asr", name: "Qwen3 ASR" }
        ]
      };
    });

    ipcMain.handle("get-current-model", async () => {
      const model = await this.databaseManager.getSetting('asr_model') || 'qwen3-asr-flash';
      return {
        model: model,
        status: "ready",
        details: {}
      };
    });

    // 性能监控
    ipcMain.handle("get-performance-stats", () => {
      // TODO: 实现性能统计功能
      return { stats: {} };
    });

    ipcMain.handle("clear-performance-stats", () => {
      // TODO: 实现清除性能统计功能
      return { success: true };
    });

    // 错误报告
    ipcMain.handle("report-error", (event, error) => {
      this.logger.error("渲染进程错误:", error);
      // TODO: 实现错误报告功能
      return true;
    });

    // 开发工具
    if (process.env.NODE_ENV === "development") {
      ipcMain.handle("open-dev-tools", (event) => {
        const window = require("electron").BrowserWindow.fromWebContents(event.sender);
        if (window) {
          window.webContents.openDevTools();
        }
      });

      ipcMain.handle("reload-window", (event) => {
        const window = require("electron").BrowserWindow.fromWebContents(event.sender);
        if (window) {
          window.reload();
        }
      });
    }

    // 日志和调试相关
    ipcMain.handle("get-app-logs", (event, lines = 100) => {
      try {
        if (this.logger && this.logger.getRecentLogs) {
          return {
            success: true,
            logs: this.logger.getRecentLogs(lines)
          };
        }
        return {
          success: false,
          error: "日志管理器不可用"
        };
      } catch (error) {
        this.logger.error("获取应用日志失败:", error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle("get-log-file-path", () => {
      try {
        if (this.logger && this.logger.getLogFilePath) {
          return {
            success: true,
            appLogPath: this.logger.getLogFilePath()
          };
        }
        return {
          success: false,
          error: "日志管理器不可用"
        };
      } catch (error) {
        this.logger.error("获取日志文件路径失败:", error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle("open-log-file", (event, logType = 'app') => {
      try {
        if (this.logger) {
          const logPath = this.logger.getLogFilePath();
          
          require("electron").shell.showItemInFolder(logPath);
          return { success: true };
        }
        return {
          success: false,
          error: "日志管理器不可用"
        };
      } catch (error) {
        this.logger.error("打开日志文件失败:", error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle("get-system-debug-info", () => {
      try {
        const debugInfo = {
          system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            electronVersion: process.versions.electron,
            appVersion: require("electron").app.getVersion()
          },
          env: {
            NODE_ENV: process.env.NODE_ENV,
            AI_API_KEY: '通过控制面板设置',
            AI_BASE_URL: '通过控制面板设置',
            AI_MODEL: '通过控制面板设置'
          }
        };

        if (this.logger && this.logger.getSystemInfo) {
          debugInfo.loggerInfo = this.logger.getSystemInfo();
        }

        return {
          success: true,
          debugInfo
        };
      } catch (error) {
        this.logger.error("获取系统调试信息失败:", error);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  // AI文本处理方法
  async processTextWithAI(text, mode = 'optimize', selectedText = null) {
    try {
      // 从数据库设置中获取API密钥
      const apiKey = await this.databaseManager.getSetting('ai_api_key');
      const customOptimizePrompt = await this.databaseManager.getSetting('ai_prompt_optimize');
      const customCommandPrompt = await this.databaseManager.getSetting('ai_prompt_command');
      const customAskPrompt = await this.databaseManager.getSetting('ai_prompt_ask');
      
      if (!apiKey) {
        return {
          success: false,
          error: '请先在设置页面配置AI API密钥'
        };
      }

      // 导入默认提示词模板
      const { defaultOptimizePrompt, defaultCommandPrompt, defaultAskPrompt } = require('./promptTemplates');

      let prompt;
      if (mode === 'command' && selectedText) {
        // 命令模式：使用命令提示词
        prompt = customCommandPrompt ? customCommandPrompt : defaultCommandPrompt;
        prompt = prompt.replace(/\${selectedText}/g, selectedText).replace(/\${text}/g, text);
      } else if (mode === 'ask') {
        // 提问模式：使用提问提示词
        prompt = customAskPrompt ? customAskPrompt : defaultAskPrompt;
        prompt = prompt.replace(/\${text}/g, text);
      } else {
        // 优化模式：使用优化提示词
        let basePrompt = customOptimizePrompt ? customOptimizePrompt : defaultOptimizePrompt;
        prompt = basePrompt.replace(/\${text}/g, text);
      }

      const baseUrl = await this.databaseManager.getSetting('ai_base_url') || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      const model = await this.databaseManager.getSetting('ai_model') || 'qwen-flash';

      const requestData = {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: false
      };

      this.logger.info('AI文本处理请求:', {
        baseUrl,
        model,
        mode,
        inputText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        requestData
      });

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = { error: response.statusText };
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || response.statusText };
        }
        throw new Error(errorData.error?.message || errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();

      this.logger.info('AI文本处理响应:', {
        status: response.status,
        data: data,
        usage: data.usage
      });

      if (data.choices && data.choices.length > 0) {
        const result = {
          success: true,
          text: data.choices[0].message.content.trim(),
          usage: data.usage,
          model: model
        };
        
        this.logger.info('AI文本处理结果:', {
          originalText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          optimizedText: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
          usage: result.usage
        });
        
        return result;
      } else {
        this.logger.error('AI API返回数据格式错误:', response.data);
        return {
          success: false,
          error: 'AI API返回数据格式错误'
        };
      }
    } catch (error) {
      this.logger.error('AI文本处理失败:', error);
      
      let errorMessage = '文本处理失败';
      if (error.response) {
        // API错误响应
        if (error.response.status === 401) {
          errorMessage = 'API密钥无效，请检查配置';
        } else if (error.response.status === 429) {
          errorMessage = 'API调用频率超限，请稍后重试';
        } else if (error.response.status === 500) {
          errorMessage = 'AI服务器错误，请稍后重试';
        } else {
          errorMessage = `API错误: ${error.response.status}`;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请检查网络连接';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = '无法连接到AI服务器，请检查网络';
      } else {
        errorMessage = error.message || '未知错误';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // 检查AI状态
  async checkAIStatus(testConfig = null) {
    try {
      this.logger.info('开始测试AI配置...', testConfig ? '使用临时配置' : '使用已保存配置');
      
      // 如果提供了测试配置，使用测试配置；否则使用已保存的配置
      let apiKey, baseUrl, model;
      
      if (testConfig) {
        apiKey = testConfig.ai_api_key;
        baseUrl = testConfig.ai_base_url || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        model = testConfig.ai_model || 'qwen-flash';
        this.logger.info('使用临时测试配置:', { baseUrl, model, apiKeyLength: apiKey?.length || 0 });
      } else {
        apiKey = await this.databaseManager.getSetting('ai_api_key');
        baseUrl = await this.databaseManager.getSetting('ai_base_url') || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        model = await this.databaseManager.getSetting('ai_model') || 'qwen-flash';
        this.logger.info('使用已保存配置:', { baseUrl, model, apiKeyLength: apiKey?.length || 0 });
      }
      
      if (!apiKey) {
        this.logger.warn('AI测试失败: 未配置API密钥');
        return {
          available: false,
          error: '未配置API密钥',
          details: '请输入AI API密钥'
        };
      }
      
      this.logger.info('AI配置信息:', {
        baseUrl: baseUrl,
        model: model,
        apiKeyLength: apiKey.length
      });
      
      // 发送一个更有意义的测试请求
      const testMessage = '请回复"测试成功"来确认AI服务正常工作';
      const requestData = {
        model: model,
        messages: [
          {
            role: 'user',
            content: testMessage
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      };

      this.logger.info('发送AI测试请求:', requestData);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      this.logger.info('AI API响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('AI API错误响应:', errorText);
        
        let errorData = { error: response.statusText };
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || response.statusText };
        }
        
        let errorMessage = errorData.error?.message || errorData.error || `HTTP ${response.status}`;
        if (response.status === 401) {
          errorMessage = 'API密钥无效或已过期';
        } else if (response.status === 403) {
          errorMessage = 'API密钥权限不足';
        } else if (response.status === 429) {
          errorMessage = 'API调用频率超限';
        } else if (response.status === 500) {
          errorMessage = 'AI服务器内部错误';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      this.logger.info('AI API成功响应:', data);

      if (!data.choices || data.choices.length === 0) {
        throw new Error('AI API返回格式异常：缺少choices字段');
      }

      const aiResponse = data.choices[0].message?.content || '';
      this.logger.info('AI回复内容:', aiResponse);

      return {
        available: true,
        model: model,
        status: 'connected',
        response: aiResponse,
        usage: data.usage,
        details: `成功连接到 ${model}，响应时间正常`
      };
    } catch (error) {
      this.logger.error('AI配置测试失败:', error);
      
      let errorMessage = '连接失败';
      if (error.message.includes('401')) {
        errorMessage = 'API密钥无效';
      } else if (error.message.includes('403')) {
        errorMessage = 'API密钥权限不足';
      } else if (error.message.includes('429')) {
        errorMessage = 'API调用频率超限';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = '无法连接到AI服务器，请检查网络和Base URL';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '连接被拒绝，请检查Base URL是否正确';
      } else if (error.message.includes('timeout')) {
        errorMessage = '请求超时，请检查网络连接';
      } else {
        errorMessage = error.message || '未知错误';
      }

      return {
        available: false,
        error: errorMessage,
        details: `测试失败原因: ${error.message}`
      };
    }
  }

  // 清理处理器
  removeAllHandlers() {
    ipcMain.removeAllListeners();
  }
}

module.exports = IPCHandlers;