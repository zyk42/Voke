import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import { toast } from "sonner";
import { LoadingDots } from "./components/ui/loading-dots";
import { useHotkey } from "./hooks/useHotkey";
import { useWindowDrag } from "./hooks/useWindowDrag";
import { useRecording } from "./hooks/useRecording";
import { useTextProcessing } from "./hooks/useTextProcessing";
import { usePermissions } from "./hooks/usePermissions";
import Sidebar from "./components/Sidebar";
import { WindowControls } from "./components/WindowControls";
import { HomePage } from "./components/pages/HomePage";
import { HistoryPage } from "./components/pages/HistoryPage";
import StatisticsPage from "./components/pages/StatisticsPage";
import { AboutPage } from "./components/pages/AboutPage";
import OverlayPage from "./components/pages/OverlayPage";

// 动态导入设置页面组件
const SettingsPage = React.lazy(() => import('./components/pages/SettingsPage'));

export default function App() {
  // 检查URL参数来决定渲染哪个页面
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page');
  const mode = urlParams.get('mode');

  // 如果是 overlay 模式，直接渲染 overlay 页面
  if (mode === 'overlay') {
    return <OverlayPage />;
  }
  
  // 如果是设置页面，直接渲染设置组件
  if (page === 'settings') {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-900 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <LoadingDots />
            <span className="text-gray-700 dark:text-gray-300">加载设置页面...</span>
          </div>
        </div>
      }>
        <SettingsPage />
      </React.Suspense>
    );
  }

  const [activeTab, setActiveTab] = useState('home');
  const [originalText, setOriginalText] = useState("");
  const [processedText, setProcessedText] = useState("");
  
  const { isDragging, handleMouseDown, handleMouseMove, handleMouseUp, handleClick } = useWindowDrag();
  
  const {
    isRecording,
    isProcessing: isRecordingProcessing,
    isOptimizing,
    startRecording,
    stopRecording,
    error: recordingError
  } = useRecording();
  
  const {
    processText,
    isProcessing: isTextProcessing,
    error: textProcessingError
  } = useTextProcessing();

  // 用于存储当前热键映射的 ref
  const hotkeyMapRef = useRef({ optimize: 'RightAlt', ask: 'RightControl' });

  // 监听录音状态，更新 Overlay
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.updateOverlayState) {
      let overlayMode = 'idle';
      if (isRecording) {
        overlayMode = 'recording';
      } else if (isRecordingProcessing || isOptimizing || isTextProcessing) {
        overlayMode = 'processing';
      }
      
      window.electronAPI.updateOverlayState({ mode: overlayMode });
    }
  }, [isRecording, isRecordingProcessing, isOptimizing, isTextProcessing]);

  // 防重复粘贴的引用
  const lastPasteRef = useRef({ text: '', timestamp: 0 });
  const PASTE_DEBOUNCE_TIME = 1000; // 1秒内相同文本不重复粘贴

  // 安全粘贴函数
  const safePaste = useCallback(async (text) => {
    const now = Date.now();
    const lastPaste = lastPasteRef.current;
    
    // 防重复粘贴：如果是相同文本且在防抖时间内，则跳过
    if (lastPaste.text === text && (now - lastPaste.timestamp) < PASTE_DEBOUNCE_TIME) {
      console.log("🚫 跳过重复粘贴，文本:", text.substring(0, 50) + "...");
      return;
    }
    
    // 更新最后粘贴记录
    lastPasteRef.current = { text, timestamp: now };
    
    console.log("🔄 safePaste 被调用，文本:", text.substring(0, 50) + "...");
    try {
      if (window.electronAPI) {
        console.log("📱 使用 Electron API 进行粘贴");
        await window.electronAPI.pasteText(text);
        console.log("✅ 粘贴成功");
        toast.success("文本已自动粘贴到当前输入框");
      } else {
        // Web环境下只能复制到剪贴板
        console.log("🌐 Web环境，仅复制到剪贴板");
        await navigator.clipboard.writeText(text);
        toast.info("文本已复制到剪贴板，请手动粘贴");
      }
    } catch (error) {
      console.error("❌ 粘贴文本失败:", error);
      toast.error("粘贴失败", {
        description: "请检查辅助功能权限。文本已复制到剪贴板 - 请手动使用 Cmd+V 粘贴。"
      });
    }
  }, []);

  // 处理录音完成（ASR识别完成）
  const handleRecordingComplete = useCallback(async (transcriptionResult) => {
    console.log("🎤 handleRecordingComplete 被调用:", transcriptionResult);
    if (transcriptionResult.success && transcriptionResult.text) {
      console.log("✅ 转录成功，文本:", transcriptionResult.text);
      // 立即显示ASR识别的原始文本
      setOriginalText(transcriptionResult.text);
      
      // 清空之前的处理结果，等待AI优化
      setProcessedText("");

      // 不立即粘贴，等待AI优化完成后再粘贴
      console.log("⏳ 等待AI优化完成后再进行粘贴...");
      
      // 注意：不在这里保存到数据库，由 useRecording.js 统一处理保存逻辑

      toast.success("🎤 语音识别完成，AI正在优化文本...");
    } else {
      console.log("❌ 转录失败或无文本:", transcriptionResult);
    }
  }, []);

  // 处理AI优化完成
  const handleAIOptimizationComplete = useCallback(async (optimizedResult) => {
    console.log('AI优化完成回调被触发:', optimizedResult);
    if (optimizedResult.success && optimizedResult.enhanced_by_ai && optimizedResult.text) {
      // 显示AI优化后的文本
      setProcessedText(optimizedResult.text);
      
      // 自动粘贴AI优化后的文本
      console.log("📋 准备粘贴AI优化后的文本:", optimizedResult.text);
      await safePaste(optimizedResult.text);
      console.log("✅ AI优化文本粘贴完成");
      
      toast.success("🤖 AI文本优化完成并已自动粘贴！");
      console.log('AI优化文本已设置:', optimizedResult.text);
    } else {
      console.warn('AI优化结果无效，使用原始文本:', optimizedResult);
      // 如果AI优化失败，则粘贴原始文本
      if (originalText) {
        console.log("📋 AI优化失败，粘贴原始文本:", originalText);
        await safePaste(originalText);
        toast.info("AI优化失败，已粘贴原始识别文本");
      }
    }
  }, [safePaste, originalText]);

  // 设置转录完成回调
  useEffect(() => {
    console.log('设置回调函数');
    window.onTranscriptionComplete = handleRecordingComplete;
    window.onAIOptimizationComplete = handleAIOptimizationComplete;
    
    // 验证回调函数是否正确设置
    console.log('回调函数设置完成:', {
      onTranscriptionComplete: typeof window.onTranscriptionComplete,
      onAIOptimizationComplete: typeof window.onAIOptimizationComplete
    });
    
    return () => {
      console.log('清理回调函数');
      window.onTranscriptionComplete = null;
      window.onAIOptimizationComplete = null;
    };
  }, [handleRecordingComplete, handleAIOptimizationComplete]);

  // 处理复制文本
  const handleCopyText = async (text) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.copyText(text);
        if (result.success) {
          toast.success("文本已复制到剪贴板");
        } else {
          throw new Error(result.error || "复制失败");
        }
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("文本已复制到剪贴板");
      }
    } catch (error) {
      console.error("复制文本失败:", error);
      toast.error(`无法复制文本到剪贴板: ${error.message}`);
    }
  };


  // 处理导出文本
  const handleExportText = async (text) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.exportTranscriptions('json');
        toast.success("记录已导出到文件");
      } else {
        // Web环境下载文件
        const blob = new Blob([JSON.stringify({ text }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TalkType转录_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error("无法导出文件");
    }
  };

  // 切换录音状态
  const toggleRecording = useCallback(() => {
    if (!isRecording && !isRecordingProcessing) {
      startRecording();
    } else if (isRecording) {
      stopRecording();
    }
  }, [isRecording, isRecordingProcessing, startRecording, stopRecording]);

  // 使用热键Hook
  const { hotkey, syncRecordingState, registerHotkey, unregisterHotkey } = useHotkey();

  // 监听热键设置变更
  useEffect(() => {
    // 检查是否为控制面板窗口
    const urlParams = new URLSearchParams(window.location.search);
    const isControlPanel = urlParams.get('panel') === 'control';
    
    if (isControlPanel) return;

    if (window.electronAPI && window.electronAPI.onHotkeySettingsChanged) {
      const unsubscribe = window.electronAPI.onHotkeySettingsChanged(async (_event, { key, value }) => {
        console.log('热键设置已更新:', key, value);
        
        let oldHotkey = null;
        let type = null;

        if (key === 'hotkey_optimize') {
          oldHotkey = hotkeyMapRef.current.optimize;
          hotkeyMapRef.current.optimize = value;
          type = 'Optimize';
          
          // 只有当旧热键没有被另一个模式使用时才注销
          if (oldHotkey && oldHotkey !== value && oldHotkey !== hotkeyMapRef.current.ask) {
            await unregisterHotkey(oldHotkey);
            console.log(`注销旧热键 (${type}): ${oldHotkey}`);
          }
        } else if (key === 'hotkey_ask') {
          oldHotkey = hotkeyMapRef.current.ask;
          hotkeyMapRef.current.ask = value;
          type = 'Ask';
          
          // 只有当旧热键没有被另一个模式使用时才注销
          if (oldHotkey && oldHotkey !== value && oldHotkey !== hotkeyMapRef.current.optimize) {
            await unregisterHotkey(oldHotkey);
            console.log(`注销旧热键 (${type}): ${oldHotkey}`);
          }
        }

        // 注册新热键
        if (value) {
          const success = await registerHotkey(value);
          if (success) {
            console.log(`注册新热键成功 (${type}): ${value}`);
            toast.success(`${type === 'Optimize' ? '指令' : '提问'}模式快捷键已更新`);
          } else {
            console.error(`注册新热键失败 (${type}): ${value}`);
            toast.error(`更新快捷键失败`);
          }
        }
      });
      
      return unsubscribe;
    }
  }, [registerHotkey, unregisterHotkey]);

  // 注册传统热键监听 - 只在主窗口注册，避免重复
  useEffect(() => {
    // 检查是否为控制面板窗口
    const urlParams = new URLSearchParams(window.location.search);
    const isControlPanel = urlParams.get('panel') === 'control';
    
    // 只有主窗口才注册热键
    if (isControlPanel) {
      console.log('控制面板窗口，跳过热键注册');
      return;
    }

    const initializeHotkey = async () => {
      try {
        // 获取配置的热键
        let hotkeyOptimize = 'RightAlt';
        let hotkeyAsk = 'RightControl';
        
        if (window.electronAPI && window.electronAPI.getAllSettings) {
          const settings = await window.electronAPI.getAllSettings();
          if (settings.hotkey_optimize) hotkeyOptimize = settings.hotkey_optimize;
          if (settings.hotkey_ask) hotkeyAsk = settings.hotkey_ask;
        }
        
        hotkeyMapRef.current = { optimize: hotkeyOptimize, ask: hotkeyAsk };
        console.log('初始化热键映射:', hotkeyMapRef.current);

        // 注册 优化/指令模式 热键
        const successOptimize = await registerHotkey(hotkeyOptimize);
        if (successOptimize) {
          console.log(`主窗口热键注册成功 (Optimize: ${hotkeyOptimize})`);
        } else {
          console.error(`主窗口热键注册失败 (Optimize: ${hotkeyOptimize})`);
        }

        // 注册 提问模式 热键
        const successAsk = await registerHotkey(hotkeyAsk);
        if (successAsk) {
          console.log(`主窗口热键注册成功 (Ask: ${hotkeyAsk})`);
        } else {
          console.error(`主窗口热键注册失败 (Ask: ${hotkeyAsk})`);
        }

        if (!successOptimize && !successAsk) {
          toast.error("注册快捷键失败");
        }
      } catch (error) {
        console.error('主窗口热键注册异常:', error);
      }
    };

    if (registerHotkey) {
      initializeHotkey();
    }
  }, [registerHotkey]);

  // 处理关闭窗口
  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.hideWindow();
    }
  };

  // 监听全局热键触发事件
  useEffect(() => {
    if (window.electronAPI) {
      // 监听传统热键触发 (Toggle)
      const unsubscribeHotkey = window.electronAPI.onHotkeyTriggered((event, data) => {
        console.log('收到热键触发事件:', data);
        console.log('当前录音状态:', isRecording, '处理状态:', isRecordingProcessing);
        toggleRecording();
      });

      // 监听热键按下 (Push-to-Talk Start)
      let unsubscribePressed = null;
      if (window.electronAPI.onHotkeyPressed) {
        unsubscribePressed = window.electronAPI.onHotkeyPressed((_event, hotkey) => {
          console.log('收到热键按下事件:', hotkey);
          
          // 根据热键决定模式
          let mode = 'optimize';
          if (hotkey === hotkeyMapRef.current.ask) {
            mode = 'ask';
          } else if (hotkey === hotkeyMapRef.current.optimize) {
            mode = 'optimize';
          }

          // 只有在空闲状态才开始录音
          if (!isRecording && !isRecordingProcessing) {
            startRecording(mode);
          }
        });
      }

      // 监听热键松开 (Push-to-Talk Stop)
      let unsubscribeReleased = null;
      if (window.electronAPI.onHotkeyReleased) {
        unsubscribeReleased = window.electronAPI.onHotkeyReleased(() => {
          console.log('收到热键松开事件');
          // 无条件调用 stopRecording，Hook 内部会处理竞态条件（例如正在启动中）
          stopRecording();
        });
      }

      // 监听旧的toggle事件（保持兼容性）
      const unsubscribeToggle = window.electronAPI.onToggleDictation(() => {
        console.log('收到旧版toggle事件');
        console.log('当前录音状态:', isRecording, '处理状态:', isRecordingProcessing);
        toggleRecording();
      });

      // 监听导航事件
      let unsubscribeNavigate = null;
      if (window.electronAPI.onNavigateTo) {
        unsubscribeNavigate = window.electronAPI.onNavigateTo((tabId) => {
          console.log('收到导航事件:', tabId);
          setActiveTab(tabId);
        });
      }

      return () => {
        unsubscribeHotkey();
        if (unsubscribePressed) unsubscribePressed();
        if (unsubscribeReleased) unsubscribeReleased();
        unsubscribeToggle();
        if (unsubscribeNavigate) unsubscribeNavigate();
      };
    }
  }, [toggleRecording, isRecording, isRecordingProcessing, startRecording, stopRecording]);

  // 同步录音状态到热键管理器
  useEffect(() => {
    if (syncRecordingState) {
      syncRecordingState(isRecording);
    }
  }, [isRecording, syncRecordingState]);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  // 错误处理
  useEffect(() => {
    if (recordingError) {
      toast.error(recordingError);
    }
  }, [recordingError]);

  useEffect(() => {
    if (textProcessingError) {
      toast.error(textProcessingError);
    }
  }, [textProcessingError]);

  return (
    <div className="flex h-screen bg-white dark:bg-black text-slate-900 dark:text-white overflow-hidden font-sans selection:bg-slate-100 selection:text-slate-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 h-full flex flex-col overflow-hidden relative bg-white dark:bg-black">
        {/* 顶部拖拽栏和窗口控制按钮 */}
        <div 
          className="w-full h-10 flex items-center justify-end px-2 draggable bg-transparent z-50 shrink-0"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <WindowControls />
        </div>

        <div className="flex-1 overflow-hidden relative w-full">
          {activeTab === 'home' && (
            <HomePage
              isRecording={isRecording}
              isRecordingProcessing={isRecordingProcessing}
              isOptimizing={isOptimizing}
              isTextProcessing={isTextProcessing}
              hotkey={hotkey}
              originalText={originalText}
              processedText={processedText}
              toggleRecording={toggleRecording}
              handleCopyText={handleCopyText}
              handleExportText={handleExportText}
              safePaste={safePaste}
              handleClick={handleClick}
            />
          )}

          {activeTab === 'history' && (
           <div className="h-full overflow-hidden">
             <HistoryPage isEmbedded={true} />
           </div>
        )}

        {activeTab === 'statistics' && (
           <div className="h-full overflow-hidden p-6 overflow-y-auto">
             <StatisticsPage />
           </div>
        )}
        
        {activeTab === 'settings' && (
           <div className="h-full overflow-hidden">
             <React.Suspense fallback={<div className="flex items-center justify-center h-full"><LoadingDots /></div>}>
               <SettingsPage isEmbedded={true} />
             </React.Suspense>
           </div>
        )}

        {activeTab === 'about' && (
           <div className="h-full overflow-hidden">
             <AboutPage isEmbedded={true} />
           </div>
        )}
      </div>
      </div>

    </div>
  );
}
