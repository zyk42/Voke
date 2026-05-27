const { clipboard } = require("electron");
const { spawn } = require("child_process");
const fs = require('fs');
const path = require('path');
const os = require('os');

class ClipboardManager {
  constructor(logger) {
    // 初始化剪贴板管理器
    this.logger = logger;
    
    // 尝试加载 osascript 模块（仅在 macOS 上）
    this.osascript = null;
    if (process.platform === "darwin") {
      try {
        this.osascript = require("osascript");
        this.safeLog("✅ osascript 模块加载成功");
      } catch (error) {
        this.safeLog("⚠️ osascript 模块加载失败，将使用备用方法", error.message);
      }
    }
  }

  // 安全日志方法 - 使用logManager记录
  safeLog(message, data = null) {
    // Optimization: Only log warnings and errors to reduce terminal output lag
    const isErrorOrWarning = message.includes("❌") || message.includes("⚠️") || message.includes("error") || message.includes("Error") || message.includes("失败");
    
    if (this.logger && isErrorOrWarning) {
      try {
        this.logger.info(message, data);
      } catch (error) {
        // 静默忽略 EPIPE 错误
        if (error.code !== "EPIPE") {
          process.stderr.write(`日志错误: ${error.message}\n`);
        }
      }
    }
  }

  // 简化的 macOS accessibility 检查
  async enableMacOSAccessibility() {
    if (process.platform !== "darwin") return true;
    
    try {
      this.safeLog("🔧 检查 macOS accessibility 权限");
      
      // 简化为基本的权限检查，不设置复杂的AXManualAccessibility
      const script = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          return frontApp
        end tell
      `;
      
      const testProcess = spawn("osascript", ["-e", script]);
      
      return new Promise((resolve) => {
        testProcess.on("close", (code) => {
          if (code === 0) {
            this.safeLog("✅ macOS accessibility 权限正常");
            resolve(true);
          } else {
            this.safeLog("⚠️ macOS accessibility 权限不足");
            resolve(false);
          }
        });
        
        testProcess.on("error", () => {
          this.safeLog("❌ accessibility 权限检查失败");
          resolve(false);
        });
      });
    } catch (error) {
      this.safeLog("❌ 检查 macOS accessibility 时出错:", error.message);
      return false;
    }
  }

  // 获取选中的文本
  async getSelectedText() {
    try {
      this.safeLog("🔍 尝试获取选中项文本");
      
      // 1. 保存当前剪贴板内容
      const originalClipboard = clipboard.readText();
      
      // 2. 清空剪贴板
      clipboard.clear();
      
      // 3. 模拟复制操作
      if (process.platform === "darwin") {
        await this.copyMacOS();
      } else if (process.platform === "win32") {
        await this.copyWindows();
      } else {
        // Linux 暂不支持自动复制，直接返回空
        return "";
      }
      
      // 4. 等待剪贴板更新 (带重试机制)
      // 优化：使用轮询检测，最长等待 400ms (8 * 50ms)
      let selectedText = "";
      for (let i = 0; i < 8; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        selectedText = clipboard.readText();
        if (selectedText && selectedText.length > 0) {
          break;
        }
      }
      
      // 6. 恢复原始剪贴板内容
      // 注意：这里需要稍微延迟一下，确保之前的读取已经完成，且不影响系统剪贴板状态
      setTimeout(() => {
        clipboard.writeText(originalClipboard);
      }, 100);
      
      if (selectedText) {
        this.safeLog("✅ 成功获取选中项文本", selectedText.substring(0, 50) + "...");
      } else {
        this.safeLog("⚠️ 未获取到选中项文本");
      }
      
      return selectedText;
    } catch (error) {
      this.safeLog("❌ 获取选中项文本失败:", error.message);
      return "";
    }
  }

  async copyMacOS() {
    return new Promise((resolve, reject) => {
      const copyProcess = spawn("osascript", [
        "-e",
        'tell application "System Events" to keystroke "c" using command down',
      ]);
      
      copyProcess.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`MacOS copy failed with code ${code}`));
      });
      
      copyProcess.on("error", (err) => reject(err));
    });
  }

  async copyWindows() {
    return new Promise((resolve, reject) => {
      // 优化：使用 VBScript 替代 PowerShell
      const vbsPath = path.join(os.tmpdir(), 'Voke_copy_v2.vbs');
      // 优化：如果文件已存在，不再重复写入
      if (!fs.existsSync(vbsPath)) {
        const vbsContent = 'Set WshShell = WScript.CreateObject("WScript.Shell")\nWScript.Sleep 50\nWshShell.SendKeys "^c"';
        try {
          fs.writeFileSync(vbsPath, vbsContent);
        } catch (e) {
          // Ignore write error, will try to use it or fallback
        }
      }
      
      try {
        const copyProcess = spawn("cscript", ["//Nologo", vbsPath]);
        
        copyProcess.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Windows copy failed with code ${code}`));
        });
        
        copyProcess.on("error", (err) => reject(err));
      } catch (e) {
        // Fallback to PowerShell
        const copyProcess = spawn("powershell", [
          "-Command",
          '$ws = New-Object -ComObject WScript.Shell; Sleep 0.1; $ws.SendKeys("^c")',
        ]);
        
        copyProcess.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Windows copy failed with code ${code}`));
        });
        
        copyProcess.on("error", (err) => reject(err));
      }
    });
  }

  // 简化的文本插入方法 - 直接使用标准粘贴方式
  async insertTextDirectly(text) {
    // 简化实现，直接使用标准的粘贴方法
    this.safeLog("🎯 使用标准粘贴方式插入文本");
    return await this.pasteText(text);
  }

  async pasteText(text) {
    try {
      // 首先保存原始剪贴板内容
      const originalClipboard = clipboard.readText();
      this.safeLog(
        "💾 已保存原始剪贴板内容",
        originalClipboard.substring(0, 50) + "..."
      );

      // 将文本复制到剪贴板 - 这总是有效的
      clipboard.writeText(text);
      this.safeLog(
        "📋 文本已复制到剪贴板",
        text.substring(0, 50) + "..."
      );

      if (process.platform === "darwin") {
        // 简化权限检查，直接尝试粘贴
        this.safeLog("🔍 检查粘贴操作的辅助功能权限");
        const hasPermissions = await this.checkAccessibilityPermissions();

        if (!hasPermissions) {
          this.safeLog("⚠️ 没有辅助功能权限 - 文本仅复制到剪贴板");
          const errorMsg =
            "需要辅助功能权限才能自动粘贴。文本已复制到剪贴板 - 请手动使用 Cmd+V 粘贴。";
          throw new Error(errorMsg);
        }

        this.safeLog("✅ 权限已授予，尝试粘贴");
        return await this.pasteMacOS(originalClipboard);
      } else if (process.platform === "win32") {
        return await this.pasteWindows(originalClipboard);
      } else {
        return await this.pasteLinux(originalClipboard);
      }
    } catch (error) {
      throw error;
    }
  }

  async pasteMacOS(originalClipboard) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const pasteProcess = spawn("osascript", [
          "-e",
          'tell application "System Events" to keystroke "v" using command down',
        ]);

        let errorOutput = "";
        let hasTimedOut = false;

        pasteProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });

        pasteProcess.on("close", (code) => {
          if (hasTimedOut) return;

          // 首先清除超时
          clearTimeout(timeoutId);

          // 清理进程引用
          pasteProcess.removeAllListeners();

          if (code === 0) {
            this.safeLog("✅ 通过 Cmd+V 模拟成功粘贴文本");
            setTimeout(() => {
              clipboard.writeText(originalClipboard);
              this.safeLog("🔄 原始剪贴板内容已恢复");
            }, 100);
            resolve();
          } else {
            const errorMsg = `粘贴失败 (代码 ${code})。文本已复制到剪贴板 - 请手动使用 Cmd+V 粘贴。`;
            reject(new Error(errorMsg));
          }
        });

        pasteProcess.on("error", (error) => {
          if (hasTimedOut) return;
          clearTimeout(timeoutId);
          pasteProcess.removeAllListeners();
          const errorMsg = `粘贴命令失败: ${error.message}。文本已复制到剪贴板 - 请手动使用 Cmd+V 粘贴。`;
          reject(new Error(errorMsg));
        });

        const timeoutId = setTimeout(() => {
          hasTimedOut = true;
          pasteProcess.kill("SIGKILL");
          pasteProcess.removeAllListeners();
          const errorMsg =
            "粘贴操作超时。文本已复制到剪贴板 - 请手动使用 Cmd+V 粘贴。";
          reject(new Error(errorMsg));
        }, 3000);
      }, 100);
    });
  }

  async pasteWindows(originalClipboard) {
    return new Promise((resolve, reject) => {
      // 优化：使用 VBScript 替代 PowerShell
      const vbsPath = path.join(os.tmpdir(), 'Voke_paste.vbs');
      // 优化：如果文件已存在，不再重复写入
      if (!fs.existsSync(vbsPath)) {
        const vbsContent = 'Set WshShell = WScript.CreateObject("WScript.Shell")\nWScript.Sleep 100\nWshShell.SendKeys "^v"';
        try {
          fs.writeFileSync(vbsPath, vbsContent);
        } catch (e) {
            // Ignore
        }
      }
      
      try {
        const pasteProcess = spawn("cscript", ["//Nologo", vbsPath]);
        
        pasteProcess.on("close", (code) => {
          if (code === 0) {
            setTimeout(() => {
              clipboard.writeText(originalClipboard);
            }, 100);
            resolve();
          } else {
             // 失败回退逻辑
             this.fallbackPasteWindows(originalClipboard, resolve, reject);
          }
        });
        
        pasteProcess.on("error", () => {
             this.fallbackPasteWindows(originalClipboard, resolve, reject);
        });
      } catch (e) {
         this.fallbackPasteWindows(originalClipboard, resolve, reject);
      }
    });
  }

  fallbackPasteWindows(originalClipboard, resolve, reject) {
      const pasteProcess = spawn("powershell", [
        "-Command",
        '$ws = New-Object -ComObject WScript.Shell; Sleep 0.1; $ws.SendKeys("^v")',
      ]);

      pasteProcess.on("close", (code) => {
        if (code === 0) {
          setTimeout(() => {
            clipboard.writeText(originalClipboard);
          }, 100);
          resolve();
        } else {
          reject(new Error(`Windows 粘贴失败，代码 ${code}`));
        }
      });

      pasteProcess.on("error", (error) => {
        reject(error);
      });
  }

  async pasteLinux(originalClipboard) {
    return new Promise((resolve, reject) => {
      const pasteProcess = spawn("xdotool", ["key", "ctrl+v"]);

      pasteProcess.on("close", (code) => {
        if (code === 0) {
          // 文本粘贴成功
          setTimeout(() => {
            clipboard.writeText(originalClipboard);
          }, 100);
          resolve();
        } else {
          reject(
            new Error(
              `Linux 粘贴失败，代码 ${code}。文本已复制到剪贴板。`
            )
          );
        }
      });

      pasteProcess.on("error", (error) => {
        reject(
          new Error(
            `Linux 粘贴失败: ${error.message}。文本已复制到剪贴板。`
          )
        );
      });
    });
  }

  async checkAccessibilityPermissions() {
    if (process.platform !== "darwin") return true;

    return new Promise((resolve) => {
      // 检查辅助功能权限
      const testProcess = spawn("osascript", [
        "-e",
        'tell application "System Events" to get name of first process',
      ]);

      let testOutput = "";
      let testError = "";

      testProcess.stdout.on("data", (data) => {
        testOutput += data.toString();
      });

      testProcess.stderr.on("data", (data) => {
        testError += data.toString();
      });

      testProcess.on("close", (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          this.showAccessibilityDialog(testError);
          resolve(false);
        }
      });

      testProcess.on("error", (error) => {
        resolve(false);
      });
    });
  }

  showAccessibilityDialog(testError) {
    const isStuckPermission =
      testError.includes("not allowed assistive access") ||
      testError.includes("(-1719)") ||
      testError.includes("(-25006)");

    let dialogMessage;
    if (isStuckPermission) {
      dialogMessage = `🔒 Voke需要辅助功能权限，但看起来您可能有来自先前版本的旧权限。

❗ 常见问题：如果您重新构建/重新安装了Voke，旧权限可能"卡住"并阻止新权限。

🔧 解决方法：
1. 打开系统设置 → 隐私与安全性 → 辅助功能
2. 查找任何旧的"Voke"条目并删除它们（点击 - 按钮）
3. 同时删除任何显示"Electron"或名称不明确的条目
4. 点击 + 按钮并手动添加新的Voke应用
5. 确保复选框已启用
6. 重启Voke

⚠️ 这在开发期间重新构建应用时特别常见。

📝 没有此权限，文本将只复制到剪贴板（无自动粘贴）。

您想现在打开系统设置吗？`;
    } else {
      dialogMessage = `🔒 Voke需要辅助功能权限才能将文本粘贴到其他应用程序中。

📋 当前状态：剪贴板复制有效，但粘贴（Cmd+V 模拟）失败。

🔧 解决方法：
1. 打开系统设置（或较旧 macOS 上的系统偏好设置）
2. 转到隐私与安全性 → 辅助功能
3. 点击锁图标并输入您的密码
4. 将Voke添加到列表中并勾选复选框
5. 重启Voke

⚠️ 没有此权限，听写文本将只复制到剪贴板但不会自动粘贴。

💡 在生产版本中，此权限是完整功能所必需的。

您想现在打开系统设置吗？`;
    }

    const permissionDialog = spawn("osascript", [
      "-e",
      `display dialog "${dialogMessage}" buttons {"取消", "打开系统设置"} default button "打开系统设置"`,
    ]);

    permissionDialog.on("close", (dialogCode) => {
      if (dialogCode === 0) {
        this.openSystemSettings();
      }
    });

    permissionDialog.on("error", (error) => {
      // 权限对话框错误 - 用户需要手动授予权限
    });
  }

  openSystemSettings() {
    const settingsCommands = [
      [
        "open",
        [
          "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
        ],
      ],
      ["open", ["-b", "com.apple.systempreferences"]],
      ["open", ["/System/Library/PreferencePanes/Security.prefPane"]],
    ];

    let commandIndex = 0;
    const tryNextCommand = () => {
      if (commandIndex < settingsCommands.length) {
        const [cmd, args] = settingsCommands[commandIndex];
        const settingsProcess = spawn(cmd, args);

        settingsProcess.on("error", (error) => {
          commandIndex++;
          tryNextCommand();
        });

        settingsProcess.on("close", (settingsCode) => {
          if (settingsCode !== 0) {
            commandIndex++;
            tryNextCommand();
          }
        });
      } else {
        // 所有设置命令都失败，尝试后备方案
        spawn("open", ["-a", "System Preferences"]).on("error", () => {
          spawn("open", ["-a", "System Settings"]).on("error", () => {
            // 无法打开设置应用
          });
        });
      }
    };

    tryNextCommand();
  }

  /**
   * 复制文本到剪贴板
   * @param {string} text - 要复制的文本
   * @returns {Promise<{success: boolean}>}
   */
  async copyText(text) {
    try {
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 从剪贴板读取文本
   * @returns {Promise<string>}
   */
  async readClipboard() {
    try {
      const text = clipboard.readText();
      return text;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 将文本写入剪贴板
   * @param {string} text - 要写入的文本
   * @returns {Promise<{success: boolean}>}
   */
  async writeClipboard(text) {
    try {
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ClipboardManager;