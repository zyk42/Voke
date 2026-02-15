import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

export const WindowControls = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Check initial state
    window.electronAPI.isWindowMaximized().then(setIsMaximized);

    // Listen for changes
    const cleanupMax = window.electronAPI.onWindowMaximized ? 
      window.electronAPI.onWindowMaximized(() => setIsMaximized(true)) : () => {};
    const cleanupUnmax = window.electronAPI.onWindowUnmaximized ? 
      window.electronAPI.onWindowUnmaximized(() => setIsMaximized(false)) : () => {};

    return () => {
      cleanupMax();
      cleanupUnmax();
    };
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    if (isMaximized) {
      window.electronAPI?.unmaximizeWindow();
    } else {
      window.electronAPI?.maximizeWindow();
    }
  };

  const handleClose = () => {
    // 使用 closeWindow 而不是 hideWindow，以符合用户"关闭"的预期
    // 如果是主窗口，Electron 可能会根据 app 事件决定是退出还是隐藏
    // 通常点击 X 应该是关闭窗口
    window.electronAPI?.closeWindow();
  };

  if (!window.electronAPI) return null;

  return (
    <div className="flex items-center space-x-0 h-8 non-draggable z-50">
      <button
        onClick={handleMinimize}
        className="h-8 w-12 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#2C2C2E] transition-colors focus:outline-none rounded-lg"
        title="最小化"
      >
        <Minus size={16} className="text-slate-500 dark:text-gray-400" />
      </button>
      <button
        onClick={handleMaximize}
        className="h-8 w-12 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#2C2C2E] transition-colors focus:outline-none rounded-lg"
        title={isMaximized ? "还原" : "最大化"}
      >
        {isMaximized ? (
          <Copy size={14} className="text-slate-500 dark:text-gray-400 transform rotate-180" /> 
        ) : (
          <Square size={14} className="text-slate-500 dark:text-gray-400" />
        )}
      </button>
      <button
        onClick={handleClose}
        className="h-8 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group focus:outline-none rounded-lg"
        title="关闭"
      >
        <X size={18} className="text-slate-500 dark:text-gray-400 group-hover:text-white" />
      </button>
    </div>
  );
};
