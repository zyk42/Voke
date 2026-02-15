const { globalShortcut } = require('electron');
const { uIOhook, UiohookKey } = require('uiohook-napi');

class HotkeyManager {
  constructor(logger = null) {
    this.registeredHotkeys = new Map();
    this.isRecording = false;
    this.logger = logger;
    this.isRightAltDown = false; // 跟踪 Right Alt 状态
    this.isRightControlDown = false; // 跟踪 Right Control 状态
    
    // 简化的热键防抖机制
    this.lastHotkeyTrigger = new Map();
    this.hotkeyDebounceTime = 50; // 50ms防抖时间，支持快速连击

    // uIOhook 初始化
    this.initUiohook();
  }

  initUiohook() {
    uIOhook.on('keydown', (e) => {
      // 3640 is the raw code for Right Alt on some systems, but UiohookKey.AltRight is safer
      // UiohookKey.AltRight (usually 0x0038 with extended flag, or specifically 3640 in raw)
      // On Windows: AltLeft is 56, AltRight is 3640
      
      if (e.keycode === UiohookKey.AltRight) {
        this.handleRightAltDown();
      }
      
      if (e.keycode === UiohookKey.CtrlRight) {
        this.handleRightControlDown();
      }
    });

    uIOhook.on('keyup', (e) => {
      if (e.keycode === UiohookKey.AltRight) {
        this.handleRightAltUp();
      }

      if (e.keycode === UiohookKey.CtrlRight) {
        this.handleRightControlUp();
      }
    });

    uIOhook.start();
    
    if (this.logger && this.logger.info) {
      this.logger.info('uIOhook 已启动，监听 Right Alt 和 Right Control');
    }
  }

  handleRightAltDown() {
    const now = Date.now();
    // 只有当之前没有按下时才触发（防重复）
    if (this.isRightAltDown) return;
    
    this.isRightAltDown = true;
    this.lastHotkeyTrigger.set('RightAlt', now);
    
    // 如果注册了 Right Alt 的回调
    if (this.registeredHotkeys.has('RightAlt')) {
      const callback = this.registeredHotkeys.get('RightAlt');
      // 传递 'down' 状态
      callback('down');
      if (this.logger && this.logger.info) {
        this.logger.info('触发 Right Alt 按下');
      }
    }
  }

  handleRightAltUp() {
    if (!this.isRightAltDown) return;
    
    this.isRightAltDown = false;
    
    // 如果注册了 Right Alt 的回调
    if (this.registeredHotkeys.has('RightAlt')) {
      const callback = this.registeredHotkeys.get('RightAlt');
      // 传递 'up' 状态
      callback('up');
      if (this.logger && this.logger.info) {
        this.logger.info('触发 Right Alt 松开');
      }
    }
  }

  handleRightControlDown() {
    const now = Date.now();
    // 只有当之前没有按下时才触发（防重复）
    if (this.isRightControlDown) return;
    
    this.isRightControlDown = true;
    this.lastHotkeyTrigger.set('RightControl', now);
    
    // 如果注册了 Right Control 的回调
    if (this.registeredHotkeys.has('RightControl')) {
      const callback = this.registeredHotkeys.get('RightControl');
      // 传递 'down' 状态
      callback('down');
      if (this.logger && this.logger.info) {
        this.logger.info('触发 Right Control 按下');
      }
    }
  }

  handleRightControlUp() {
    if (!this.isRightControlDown) return;
    
    this.isRightControlDown = false;
    
    // 如果注册了 Right Control 的回调
    if (this.registeredHotkeys.has('RightControl')) {
      const callback = this.registeredHotkeys.get('RightControl');
      // 传递 'up' 状态
      callback('up');
      if (this.logger && this.logger.info) {
        this.logger.info('触发 Right Control 松开');
      }
    }
  }

  /**
   * 注册传统热键（如Cmd+Shift+Space）
   * @param {string} hotkey - 热键组合
   * @param {Function} callback - 回调函数
   */
  registerHotkey(hotkey, callback) {
    // 特殊处理 Right Alt
    if (hotkey === 'Alt' || hotkey === 'RightAlt') {
      if (this.logger && this.logger.info) {
        this.logger.info(`注册 Right Alt 监听`);
      }
      this.registeredHotkeys.set('RightAlt', callback);
      return true;
    }

    // 特殊处理 Right Control
    if (hotkey === 'Control' || hotkey === 'RightControl') {
      if (this.logger && this.logger.info) {
        this.logger.info(`注册 Right Control 监听`);
      }
      this.registeredHotkeys.set('RightControl', callback);
      return true;
    }

    // 检查是否已经注册了相同的热键
    if (this.registeredHotkeys.has(hotkey)) {
      if (this.logger && this.logger.info) {
        this.logger.info(`热键 ${hotkey} 已注册，跳过重复注册`);
      }
      return true; // 返回成功，因为热键已经注册
    }

    // 创建带简单防抖的回调函数
    const debouncedCallback = () => {
      const now = Date.now();
      const lastTrigger = this.lastHotkeyTrigger.get(hotkey) || 0;
      
      // 简单防抖：防止意外的快速重复触发
      if (now - lastTrigger < this.hotkeyDebounceTime) {
        return;
      }
      
      this.lastHotkeyTrigger.set(hotkey, now);
      callback();
    };

    const success = globalShortcut.register(hotkey, debouncedCallback);
    
    if (success) {
      if (this.logger && this.logger.info) {
        this.logger.info(`热键 ${hotkey} 注册成功`);
      }
      this.registeredHotkeys.set(hotkey, debouncedCallback);
      return true;
    } else {
      if (this.logger && this.logger.error) {
        this.logger.error(`热键 ${hotkey} 注册失败`);
      }
      return false;
    }
  }

  /**
   * 注销热键
   * @param {string} hotkey - 热键组合
   */
  unregisterHotkey(hotkey) {
    if (this.registeredHotkeys.has(hotkey)) {
      globalShortcut.unregister(hotkey);
      this.registeredHotkeys.delete(hotkey);
      if (this.logger && this.logger.info) {
        this.logger.info(`热键 ${hotkey} 已注销`);
      }
      return true;
    }
    return false;
  }

  /**
   * 注销所有热键
   */
  unregisterAllHotkeys() {
    globalShortcut.unregisterAll();
    this.registeredHotkeys.clear();
    
    // 停止 uIOhook (可选，如果应用退出才停止，或者一直运行)
    // uIOhook.stop(); 
    
    if (this.logger && this.logger.info) {
      this.logger.info('所有热键已注销');
    }
  }

  /**
   * 获取已注册的热键列表
   */
  getRegisteredHotkeys() {
    return Array.from(this.registeredHotkeys.keys());
  }

  /**
   * 检查热键是否已注册
   * @param {string} hotkey - 热键组合
   */
  isHotkeyRegistered(hotkey) {
    return this.registeredHotkeys.has(hotkey);
  }

  /**
   * 设置录音状态（用于外部同步状态）
   * @param {boolean} isRecording - 录音状态
   */
  setRecordingState(isRecording) {
    this.isRecording = isRecording;
  }

  /**
   * 获取当前录音状态
   */
  getRecordingState() {
    return this.isRecording;
  }
}

module.exports = HotkeyManager;