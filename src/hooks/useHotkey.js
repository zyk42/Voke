import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 热键管理Hook
 * 处理全局快捷键功能
 */
export const useHotkey = () => {
  const [hotkey, setHotkey] = useState('Right Alt');
  const [isRegistered, setIsRegistered] = useState(false);
  const registeredHotkeysRef = useRef(new Set()); // 跟踪已注册的热键集合

  // 获取当前热键
  useEffect(() => {
    const getCurrentHotkey = async () => {
      try {
        if (window.electronAPI) {
          const currentHotkey = await window.electronAPI.getCurrentHotkey();
          if (currentHotkey) {
            setHotkey(currentHotkey);
            registeredHotkeysRef.current.add(currentHotkey);
            setIsRegistered(true);
          }
        }
      } catch (error) {
        if (window.electronAPI && window.electronAPI.log) {
          window.electronAPI.log('warn', '获取当前热键失败:', error);
        }
      }
    };

    getCurrentHotkey();
  }, []);

  // 注册传统热键 - 添加防重复注册机制
  const registerHotkey = useCallback(async (newHotkey) => {
    try {
      // 防重复注册：如果已经注册了相同的热键，直接返回成功
      if (registeredHotkeysRef.current.has(newHotkey)) {
        console.log(`热键 ${newHotkey} 已注册，跳过重复注册`);
        return true;
      }

      if (window.electronAPI) {
        const result = await window.electronAPI.registerHotkey(newHotkey);
        if (result.success) {
          registeredHotkeysRef.current.add(newHotkey);
          setHotkey(newHotkey);
          setIsRegistered(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '注册热键失败:', error);
      }
      return false;
    }
  }, []);

  // 注销传统热键
  const unregisterHotkey = useCallback(async (hotkeyToUnregister) => {
    try {
      const targetHotkey = hotkeyToUnregister || hotkey;
      if (window.electronAPI) {
        const result = await window.electronAPI.unregisterHotkey(targetHotkey);
        if (result.success) {
          registeredHotkeysRef.current.delete(targetHotkey);
          if (registeredHotkeysRef.current.size === 0) {
            setIsRegistered(false);
          }
        }
      }
    } catch (error) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '注销热键失败:', error);
      }
    }
  }, [hotkey]);

  // 同步录音状态到主进程
  const syncRecordingState = useCallback(async (isRecording) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.setRecordingState(isRecording);
      }
    } catch (error) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '同步录音状态失败:', error);
      }
    }
  }, []);

  // 格式化热键显示
  const formatHotkey = (hotkeyString) => {
    const isMac = navigator.platform.includes('Mac');
    return hotkeyString
      .replace('CommandOrControl', isMac ? '⌘' : 'Ctrl')
      .replace('Shift', '⇧')
      .replace('Alt', isMac ? '⌥' : 'Alt')
      .replace('Space', '空格')
      .replace('+', ' + ');
  };

  return {
    hotkey: formatHotkey(hotkey),
    rawHotkey: hotkey,
    isRegistered,
    registerHotkey,
    unregisterHotkey,
    syncRecordingState
  };
};