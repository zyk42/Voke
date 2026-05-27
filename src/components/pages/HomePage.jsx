import React, { useState } from "react";
import { Mic, Copy, Download } from "lucide-react";
import { LoadingDots } from "../ui/loading-dots";
import { UsageGuide } from "../ui/usage-guide";

// 声波图标组件（空闲/悬停状态）
const SoundWaveIcon = ({ size = 16, isActive = false }) => {
  return (
    <div className="flex items-center justify-center gap-1">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`bg-slate-600 dark:bg-gray-300 rounded-full transition-all duration-150 shadow-sm ${
            isActive ? "wave-bar" : ""
          }`}
          style={{
            width: size * 0.15,
            height: isActive ? size * 0.8 : size * 0.4,
            animationDelay: isActive ? `${i * 0.1}s` : "0s",
          }}
        />
      ))}
    </div>
  );
};

// 语音波形指示器组件（处理状态）
const VoiceWaveIndicator = ({ isListening }) => {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`w-0.5 bg-white rounded-full transition-all duration-150 drop-shadow-sm ${
            isListening ? "animate-pulse h-5" : "h-2"
          }`}
          style={{
            animationDelay: isListening ? `${i * 0.1}s` : "0s",
            animationDuration: isListening ? `${0.6 + i * 0.1}s` : "0s",
          }}
        />
      ))}
    </div>
  );
};

// 增强的工具提示组件
const Tooltip = ({ children, content, position = "top" }) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    if (position === "bottom") {
      return {
        tooltip: "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-white bg-gradient-to-r from-neutral-800 to-neutral-700 rounded-md whitespace-nowrap z-50 transition-opacity duration-150",
        arrow: "absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-neutral-800"
      };
    }
    // 默认为顶部
    return {
      tooltip: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-white bg-gradient-to-r from-neutral-800 to-neutral-700 rounded-md whitespace-nowrap z-50 transition-opacity duration-150",
      arrow: "absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-neutral-800"
    };
  };

  const { tooltip, arrow } = getPositionClasses();

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={tooltip}
          style={{ fontSize: "10px" }}
        >
          {content}
          <div className={arrow}></div>
        </div>
      )}
    </div>
  );
};

// 文本显示区域组件
const TextDisplay = ({ originalText, processedText, isProcessing, onCopy, onExport, onPaste }) => {
  if (!originalText && !processedText) {
    return null; // 当没有文本时不显示任何内容，避免重复
  }

  return (
    <div className="space-y-6">
      {/* 原始识别文本 - 极简设计 */}
      {originalText && (
        <div className="group relative">
            <div className="absolute left-0 top-3 bottom-3 w-1 bg-slate-200 rounded-full opacity-50"></div>
            <div className="pl-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">原始识别</span>
                <button
                  onClick={() => onCopy(originalText)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-md transition-all duration-200"
                  title="复制识别文本"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                </button>
              </div>
              <p className="chinese-content text-slate-500 text-sm leading-relaxed">
                {originalText}
              </p>
            </div>
        </div>
      )}

      {/* AI处理后文本 - 高级卡片设计 */}
      {(processedText || isProcessing) && (
        <div className="bg-white dark:bg-black rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-zinc-800 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white"></div>
                <h3 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white uppercase">AI 优化结果</h3>
            </div>
            <div className="flex space-x-1">
              {processedText && (
                <>
                  <button
                    onClick={() => onCopy(processedText)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-slate-400 hover:text-slate-900 dark:text-gray-500 dark:hover:text-white"
                    title="复制优化文本"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 text-slate-400">
              <LoadingDots className="text-slate-900 dark:text-white" />
              <span className="text-xs tracking-widest uppercase">AI正在思考中</span>
            </div>
          ) : (
            <p className="chinese-content text-base leading-loose text-slate-800 dark:text-gray-200 font-normal">
              {processedText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const HomePage = ({
  isRecording,
  isRecordingProcessing,
  isOptimizing,
  isTextProcessing,
  hotkey,
  originalText,
  processedText,
  toggleRecording,
  handleCopyText,
  handleExportText,
  safePaste,
  handleClick
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // 确定当前麦克风状态
  const getMicState = () => {
    if (isRecording) return "recording";
    if (isRecordingProcessing) return "processing";
    if (isOptimizing) return "optimizing";
    if (isHovered && !isRecording && !isRecordingProcessing && !isOptimizing) return "hover";
    return "idle";
  };

  const micState = getMicState();

  // 获取麦克风按钮属性
  const getMicButtonProps = () => {
    const baseClasses =
      "rounded-full w-20 h-20 flex items-center justify-center relative overflow-hidden transition-all duration-300";

    // 极简风格按钮：白色背景，轻微阴影
    const buttonStyle = `${baseClasses} bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:scale-105 hover:border-slate-300 dark:hover:border-zinc-700`;

    switch (micState) {
      case "idle":
        return {
          className: `${buttonStyle} cursor-pointer group`,
          tooltip: `按 [${hotkey}] 开始录音`,
          disabled: false
        };
      case "hover":
        return {
          className: `${buttonStyle} scale-105 cursor-pointer group`,
          tooltip: `按 [${hotkey}] 开始录音`,
          disabled: false
        };
      case "recording":
        return {
          className: `${buttonStyle} cursor-pointer`,
          tooltip: "正在录音...",
          disabled: false
        };
      case "processing":
        return {
          className: `${buttonStyle} border-slate-200 cursor-not-allowed`,
          tooltip: "正在识别语音...",
          disabled: true
        };
      case "optimizing":
        return {
          className: `${buttonStyle} border-slate-200 cursor-not-allowed`,
          tooltip: "AI正在优化文本...",
          disabled: true
        };
      default:
        return {
          className: `${buttonStyle} cursor-pointer`,
          tooltip: "点击开始录音",
          disabled: false
        };
    }
  };

  const micProps = getMicButtonProps();

  return (
    <div className="h-full bg-slate-50 dark:bg-zinc-900 flex flex-col">
      {/* 标题栏 */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-200/60 dark:border-zinc-800 bg-white/80 dark:bg-black/90 backdrop-blur-md shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight chinese-title">
            Voke — AI 语音转录助手
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-8">
        <div className="max-w-3xl mx-auto min-h-full flex flex-col">
          {/* 录音控制区域 - 极简中心化 - 更紧凑 */}
          <div className="text-center mb-6 flex-shrink-0 flex flex-col items-center justify-center py-4">
          <Tooltip content={micProps.tooltip}>
            <button
              onClick={(e) => {
                if (handleClick && handleClick(e)) {
                   if (!micProps.disabled) toggleRecording();
                } else if (!micProps.disabled) {
                   toggleRecording();
                }
              }}
              onMouseEnter={() => {
                if (!micProps.disabled) {
                  setIsHovered(true);
                }
              }}
              onMouseLeave={() => setIsHovered(false)}
              className={`${micProps.className} non-draggable`}
              disabled={micProps.disabled}
            >
              {/* 动态内容基于状态 */}
              {micState === "idle" || micState === "hover" ? (
                <Mic className={`w-8 h-8 transition-colors duration-300 ${isHovered ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-500'}`} strokeWidth={1.5} />
              ) : micState === "recording" ? (
                <div className="w-3 h-3 rounded-sm bg-red-500 animate-pulse"></div>
              ) : micState === "processing" ? (
                <VoiceWaveIndicator isListening={true} />
              ) : micState === "optimizing" ? (
                <LoadingDots className="text-slate-900 dark:text-white" />
              ) : null}
            </button>
          </Tooltip>
          
          <p className="mt-3 text-sm font-medium tracking-wide text-slate-400 dark:text-gray-500 h-6">
            {micState === "recording" ? (
              <span className="text-red-500 animate-pulse">正在录音...</span>
            ) : micState === "processing" ? (
              "正在识别..."
            ) : micState === "optimizing" ? (
              "AI 优化中..."
            ) : (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">点击开始录音</span>
            )}
          </p>
        </div>

        {/* 文本显示区域 - 可滚动 */}
          <div className="flex-1 text-area-scroll">
            <TextDisplay
              originalText={originalText}
              processedText={processedText}
              isProcessing={isTextProcessing || isOptimizing}
              onCopy={handleCopyText}
              onExport={handleExportText}
              onPaste={safePaste}
            />
          </div>

          {/* 使用方式 */}
          <UsageGuide />
        </div>
      </div>
    </div>
  );
};
