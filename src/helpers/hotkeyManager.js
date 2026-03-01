const { globalShortcut } = require('electron');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const EventEmitter = require('events');

class HotkeyManager extends EventEmitter {
  constructor(logger = null) {
    super();
    this.registeredHotkeys = new Map();
    this.isRecording = false;
    this.logger = logger;
    
    // 跟踪所有支持的修饰键状态
    this.keyStates = new Map(); // keyName -> boolean
    
    // 打字监控状态
    this.typingMonitorEnabled = true;
    this.keystrokeCount = 0;
    this.lastKeystrokeTime = 0;
    this.TYPING_THRESHOLD = 24; // 连续打字字符数阈值
    this.TYPING_GAP_THRESHOLD = 5000; // 5秒内无输入则重置计数
    this.suggestionCooldown = 0;
    this.COOLDOWN_DURATION = 5 * 60 * 1000; // 5分钟冷却时间
    
    // 支持的修饰键
    this.SUPPORTED_KEYS = {
      'RightAlt': UiohookKey.AltRight,
      'RightControl': UiohookKey.CtrlRight,
      'LeftAlt': UiohookKey.Alt,
      'LeftControl': UiohookKey.Ctrl
    };
    
    // 反向映射：keycode -> keyName
    this.KEYCODE_TO_NAME = {};
    Object.entries(this.SUPPORTED_KEYS).forEach(([name, code]) => {
      this.KEYCODE_TO_NAME[code] = name;
    });

    // 简化的热键防抖机制
    this.lastHotkeyTrigger = new Map();
    this.hotkeyDebounceTime = 50; // 50ms防抖时间，支持快速连击

    // uIOhook 初始化
    this.initUiohook();
  }

  initUiohook() {
    uIOhook.on('keydown', (e) => {
      // 监控打字行为
      this.monitorTyping();

      const keyName = this.KEYCODE_TO_NAME[e.keycode];
      if (keyName) {
        this.handleModifierDown(keyName);
      }
    });

    uIOhook.on('keyup', (e) => {
      const keyName = this.KEYCODE_TO_NAME[e.keycode];
      if (keyName) {
        this.handleModifierUp(keyName);
      }
    });

    uIOhook.start();
    
    if (this.logger && this.logger.info) {
      this.logger.info('uIOhook 已启动，监听修饰键');
    }
  }

  monitorTyping() {
    if (!this.typingMonitorEnabled) return;
    if (this.isRecording) return; // 录音时不需要提示

    const now = Date.now();
    
    // 如果超过间隔阈值，重置计数
    if (now - this.lastKeystrokeTime > this.TYPING_GAP_THRESHOLD) {
      this.keystrokeCount = 0;
    }
    
    this.keystrokeCount++;
    this.lastKeystrokeTime = now;
    
    // 检查是否达到触发阈值
    if (this.keystrokeCount >= this.TYPING_THRESHOLD) {
      // 检查冷却时间
      if (now > this.suggestionCooldown) {
        this.emit('typing-suggestion');
        this.suggestionCooldown = now + this.COOLDOWN_DURATION;
        this.keystrokeCount = 0; // 重置计数
        if (this.logger && this.logger.info) {
          this.logger.info('触发打字提示建议');
        }
      }
    }
  }

  /**
   * 设置打字监控是否启用
   * @param {boolean} enabled 
   */
  setTypingMonitorEnabled(enabled) {
    this.typingMonitorEnabled = enabled;
  }


  handleModifierDown(keyName) {
    const now = Date.now();
    // 只有当之前没有按下时才触发（防重复）
    if (this.keyStates.get(keyName)) return;
    
    this.keyStates.set(keyName, true);
    this.lastHotkeyTrigger.set(keyName, now);
    
    // 如果注册了该键的回调（单键模式）
    if (this.registeredHotkeys.has(keyName)) {
      const callback = this.registeredHotkeys.get(keyName);
      // 传递 'down' 状态
      if (typeof callback === 'function') {
        callback('down');
        if (this.logger && this.logger.info) {
          this.logger.info(`触发 ${keyName} 按下`);
        }
      }
    }
  }

  handleModifierUp(keyName) {
    if (!this.keyStates.get(keyName)) return;
    
    this.keyStates.set(keyName, false);
    
    // 如果注册了该键的回调
    if (this.registeredHotkeys.has(keyName)) {
      const callback = this.registeredHotkeys.get(keyName);
      // 传递 'up' 状态
      if (typeof callback === 'function') {
        callback('up');
        if (this.logger && this.logger.info) {
          this.logger.info(`触发 ${keyName} 松开`);
        }
      }
    }
  }

  /**
   * 注册热键
   * @param {string} hotkey - 热键组合
   * @param {Function} callback - 回调函数
   */
  registerHotkey(hotkey, callback) {
    // 特殊别名处理
    if (hotkey === 'Alt') hotkey = 'RightAlt';
    if (hotkey === 'Control') hotkey = 'RightControl';

    // 检查是否为支持的键或组合键（通过 uIOhook 处理）
    if (this.SUPPORTED_KEYS[hotkey]) {
      if (this.logger && this.logger.info) {
        this.logger.info(`注册热键监听: ${hotkey}`);
      }
      this.registeredHotkeys.set(hotkey, callback);
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
    // 特殊别名处理
    if (hotkey === 'Alt') hotkey = 'RightAlt';
    if (hotkey === 'Control') hotkey = 'RightControl';

    if (this.registeredHotkeys.has(hotkey)) {
      // 如果是支持的键，只需要从 map 中删除
      if (this.SUPPORTED_KEYS[hotkey]) {
        this.registeredHotkeys.delete(hotkey);
        // 重置按键状态
        this.keyStates.set(hotkey, false);
      } else {
        // 如果是普通热键，需要调用 globalShortcut.unregister
        globalShortcut.unregister(hotkey);
        this.registeredHotkeys.delete(hotkey);
      }
      
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
