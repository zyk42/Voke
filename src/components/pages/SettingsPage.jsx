import React, { useState, useEffect } from "react";
import "../../index.css";
import { toast, Toaster } from "sonner";
import { Settings, Save, Eye, EyeOff, X, Loader2, TestTube, CheckCircle, XCircle, Mic, Shield } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import PermissionCard from "../ui/permission-card";

const SettingsPage = ({ isEmbedded = false }) => {
  const [settings, setSettings] = useState({
    asr_api_key: "",
    asr_base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    asr_model: "qwen3-asr-flash",
    ai_api_key: "",
    ai_base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    ai_model: "qwen-flash",
    enable_ai_optimization: true,
    ai_prompt_optimize: "",
    ai_prompt_command: "",
    ai_prompt_ask: "",
    hotkey_optimize: "RightAlt",
    hotkey_ask: "RightControl"
  });

  const availableHotkeys = [
    { label: "Right Alt", value: "RightAlt" },
    { label: "Right Control", value: "RightControl" },
    { label: "Left Alt", value: "LeftAlt" },
    { label: "Left Control", value: "LeftControl" }
  ];

  const defaultOptimizePrompt = `## 角色
专业ASR语音转录文本优化助手，对初步转录文本进行去除言语干扰噪音，保留说话人原始意图、个人风格及用语习惯。

## 原则
1. 纠正明显语法错误、指代模糊等
2. 移除无意义词：呃、嗯、啊这、那个、内个、然后那个、就是说等
3. 保留原貌：最大化保留用户原始用词、句式、语气
4. 分条整理：若原始文本适合分条列举，优化后需按分条格式输出，提升可读性
4. 可读优先：不改变原意的前提下，提升流畅度
5. 整合自我修正：保留最终修正内容，删除被修正部分（例：会议定在周三，呃不对，是周四→会议定在周四）

## 输入与输出
### 输入：
原始转录文本：\${text}
### 输出：
直接返回优化后文本，无任何解释；`;

  const defaultCommandPrompt = `## 角色
你是一个智能文本助手。用户选中了一段文本，并给出了修改指令，请根据用户的指令修改选中的文本。

## 原则
1. 严格按照用户指令修改选中的文本。
2. 如果指令不明确，保持原文。
3. 常见指令：
   - 文本润色
   - 修改格式
   - 文本总结
   - 文本翻译
   - 等其它指令

## 输入与输出
### 输入：
1. 选中的文本： \${selectedText}
2. 用户的修改指令： \${text}

### 输出：
直接返回修改后的文本，无任何解释；`;

  const defaultAskPrompt = `## 角色
你是一个博学多才的智能助手。用户通过语音输入了一个问题或指令，请根据用户的输入提供准确、有用的回答。

## 原则
1. 准确性：确保回答的内容准确无误。
2. 简洁性：回答言简意赅，直接切入主题。
3. 格式化：如果内容适合，使用Markdown格式（如列表、加粗等）增强可读性。

## 输入与输出
### 输入：
1. 选中的文本（可选，如果没有则为空直接回答问题即可）： \${selectedText}
2. 用户的语音转录文本：\${text}

### 输出：
直接返回你的回答。`;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAsrApiKey, setShowAsrApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // 权限管理
  const showAlert = (alert) => {
    toast(alert.title, {
      description: alert.description,
      duration: 4000,
    });
  };

  const {
    micPermissionGranted,
    accessibilityPermissionGranted,
    requestMicPermission,
    testAccessibilityPermission,
  } = usePermissions(showAlert);

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const allSettings = await window.electronAPI.getAllSettings();
        const loadedSettings = {
          asr_api_key: allSettings.asr_api_key || "",
          asr_base_url: allSettings.asr_base_url || "https://dashscope.aliyuncs.com/compatible-mode/v1",
          asr_model: allSettings.asr_model || "qwen3-asr-flash",
          ai_api_key: allSettings.ai_api_key || "",
          ai_base_url: allSettings.ai_base_url || "https://dashscope.aliyuncs.com/compatible-mode/v1",
          ai_model: allSettings.ai_model || "qwen-flash",
          enable_ai_optimization: allSettings.enable_ai_optimization !== false, // 默认为true
          ai_prompt_optimize: allSettings.ai_prompt_optimize || defaultOptimizePrompt,
          ai_prompt_command: allSettings.ai_prompt_command || defaultCommandPrompt,
          ai_prompt_ask: allSettings.ai_prompt_ask || defaultAskPrompt,
          hotkey_optimize: allSettings.hotkey_optimize || "RightAlt",
          hotkey_ask: allSettings.hotkey_ask || "RightControl"
        };
        setSettings(prev => ({ ...prev, ...loadedSettings }));
      }
    } catch (error) {
      console.error("加载设置失败:", error);
      toast.error("加载设置失败");
    } finally {
      setLoading(false);
    }
  };

  // 保存设置
  const saveSettings = async () => {
    try {
      setSaving(true);
      if (window.electronAPI) {
        // 保存每个设置项
        await window.electronAPI.setSetting('asr_api_key', settings.asr_api_key);
        await window.electronAPI.setSetting('asr_base_url', settings.asr_base_url);
        await window.electronAPI.setSetting('asr_model', settings.asr_model);
        await window.electronAPI.setSetting('ai_api_key', settings.ai_api_key);
        await window.electronAPI.setSetting('ai_base_url', settings.ai_base_url);
        await window.electronAPI.setSetting('ai_model', settings.ai_model);
        await window.electronAPI.setSetting('enable_ai_optimization', settings.enable_ai_optimization);
        await window.electronAPI.setSetting('ai_prompt_optimize', settings.ai_prompt_optimize);
        await window.electronAPI.setSetting('ai_prompt_command', settings.ai_prompt_command);
        await window.electronAPI.setSetting('ai_prompt_ask', settings.ai_prompt_ask);
        await window.electronAPI.setSetting('hotkey_optimize', settings.hotkey_optimize);
        await window.electronAPI.setSetting('hotkey_ask', settings.hotkey_ask);
        
        toast.success("设置保存成功");
      }
    } catch (error) {
      console.error("保存设置失败:", error);
      toast.error("保存设置失败");
    } finally {
      setSaving(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 测试AI配置
  const testAIConfiguration = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      
      // 验证当前输入的配置
      if (!settings.ai_api_key.trim()) {
        setTestResult({
          available: false,
          error: '请先输入API密钥',
          details: 'API密钥不能为空'
        });
        toast.error("配置不完整", {
          description: "请先输入API密钥"
        });
        return;
      }
      
      if (window.electronAPI) {
        // 使用当前页面的配置进行测试，而不是已保存的配置
        const testConfig = {
          ai_api_key: settings.ai_api_key.trim(),
          ai_base_url: settings.ai_base_url.trim() || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          ai_model: settings.ai_model.trim() || 'qwen-flash'
        };
        
        const result = await window.electronAPI.checkAIStatus(testConfig);
        setTestResult(result);
        
        if (result.available) {
          toast.success("AI配置测试成功！", {
            description: `模型: ${result.model || '未知'} - 连接正常`
          });
        } else {
          toast.error("AI配置测试失败", {
            description: result.error || "未知错误"
          });
        }
      }
    } catch (error) {
      console.error("测试AI配置失败:", error);
      setTestResult({
        available: false,
        error: error.message || "测试失败"
      });
      toast.error("测试失败", {
        description: error.message || "未知错误"
      });
    } finally {
      setTesting(false);
    }
  };

  // 关闭窗口
  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.hideSettingsWindow();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-slate-900 dark:text-white" />
          <span className="text-slate-500 dark:text-gray-400 text-sm tracking-wide">加载设置中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isEmbedded ? 'h-full' : 'h-screen'} bg-slate-50 dark:bg-zinc-900 flex flex-col`}>
      {/* 标题栏 - 固定在顶部 */}
      <div className={`bg-white/80 dark:bg-black/90 backdrop-blur-md border-b border-slate-200/60 dark:border-zinc-800 px-6 py-3 flex-shrink-0 shadow-sm ${isEmbedded ? 'sticky top-0 z-10' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white chinese-title">设置</h1>
          </div>
          {!isEmbedded && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              关闭窗口
            </button>
          )}
        </div>
      </div>

      {/* 主要内容 - 可滚动 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto p-8 pb-12 space-y-8">
          {/* 权限管理部分 */}
          {/* 快捷键设置 */}
          <section>
            <div className="mb-4 ml-1">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide uppercase">
                快捷键设置
              </h2>
            </div>
            <div className="bg-white dark:bg-black rounded-2xl p-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-zinc-800">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-900 dark:text-white">录音润色/指令模式</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400">长按进行录音，松开后自动优化文本或执行指令</p>
                    </div>
                  </div>
                  <select
                    value={settings.hotkey_optimize}
                    onChange={(e) => handleInputChange('hotkey_optimize', e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {availableHotkeys.map(key => (
                      <option key={key.value} value={key.value} disabled={settings.hotkey_ask === key.value}>
                        {key.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-900 dark:text-white">提问模式</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400">长按进行提问，松开后AI回答问题</p>
                    </div>
                  </div>
                  <select
                    value={settings.hotkey_ask}
                    onChange={(e) => handleInputChange('hotkey_ask', e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {availableHotkeys.map(key => (
                      <option key={key.value} value={key.value} disabled={settings.hotkey_optimize === key.value}>
                        {key.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* 权限测试 */}
          <section>
            <div className="mb-4 ml-1">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide uppercase">
                权限测试
              </h2>
            </div>
            <div className="bg-white dark:bg-black rounded-2xl p-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-zinc-800">
              <div className="p-5 space-y-3">
                <PermissionCard
                  icon={Mic}
                  title="麦克风权限"
                  description="录制语音所需的权限"
                  granted={micPermissionGranted}
                  onRequest={requestMicPermission}
                  buttonText="测试麦克风"
                />

                <PermissionCard
                  icon={Shield}
                  title="辅助功能权限"
                  description="自动粘贴文本所需的权限"
                  granted={accessibilityPermissionGranted}
                  onRequest={testAccessibilityPermission}
                  buttonText="测试权限"
                />
              </div>
            </div>
          </section>

          {/* 语音转文字配置 (ASR) */}
          <section>
            <div className="mb-4 ml-1">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide uppercase">
                ASR语音转文字配置 
              </h2>
            </div>
            <div className="bg-white dark:bg-black rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-zinc-800 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="p-6 space-y-6">
                {/* ASR API Key */}
                <div className="group">
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-2 uppercase tracking-wider group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors">
                    ASR API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showAsrApiKey ? "text" : "password"}
                      value={settings.asr_api_key}
                      onChange={(e) => handleInputChange('asr_api_key', e.target.value)}
                      placeholder="ASR API Key"
                      className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white bg-white dark:bg-black text-slate-900 dark:text-white transition-all outline-none placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAsrApiKey(!showAsrApiKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1"
                    >
                      {showAsrApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ASR Base URL */}
                <div className="group">
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-2 uppercase tracking-wider group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors">
                    ASR Base URL
                  </label>
                  <input
                    type="url"
                    value={settings.asr_base_url}
                    onChange={(e) => handleInputChange('asr_base_url', e.target.value)}
                    placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white bg-white dark:bg-zinc-900 text-slate-900 dark:text-white transition-all outline-none"
                  />
                </div>

                {/* ASR Model */}
                <div className="group">
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-2 uppercase tracking-wider group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors">
                    ASR Model Name
                  </label>
                  <input
                    type="text"
                    value={settings.asr_model}
                    onChange={(e) => handleInputChange('asr_model', e.target.value)}
                    placeholder="qwen3-asr-flash"
                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white bg-white dark:bg-zinc-900 text-slate-900 dark:text-white transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* AI 润色配置 */}
          <section>
            <div className="mb-4 ml-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide uppercase">
                AI 优化配置
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-gray-400">启用优化</span>
                <button
                   type="button"
                   role="switch"
                   aria-checked={settings.enable_ai_optimization}
                   onClick={() => handleInputChange('enable_ai_optimization', !settings.enable_ai_optimization)}
                   className={`${
                     settings.enable_ai_optimization ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-zinc-800'
                   } relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                 >
                   <span
                     aria-hidden="true"
                     className={`${
                       settings.enable_ai_optimization ? 'translate-x-4 bg-white dark:bg-black' : 'translate-x-0 bg-white dark:bg-gray-400'
                     } inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out`}
                   />
                 </button>
              </div>
            </div>
            
            <div className="bg-white dark:bg-black rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-zinc-800 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="p-6 space-y-6">
               {/* API Key */}
                <div className="group">
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-2 uppercase tracking-wider group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={settings.ai_api_key}
                      onChange={(e) => handleInputChange('ai_api_key', e.target.value)}
                      placeholder="AI API Key"
                      className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white bg-white dark:bg-zinc-900 text-slate-900 dark:text-white transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Base URL */}
                <div className="group">
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-2 uppercase tracking-wider group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors">
                    API Base URL
                  </label>
                  <input
                    type="url"
                    value={settings.ai_base_url}
                    onChange={(e) => handleInputChange('ai_base_url', e.target.value)}
                    placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white bg-white dark:bg-zinc-900 text-slate-900 dark:text-white transition-all outline-none"
                  />
                </div>

                {/* Model */}
                <div className="group">
                   <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors">
                      Model Name
                    </label>
                  </div>
                  
                  <input
                    type="text"
                    value={settings.ai_model}
                    onChange={(e) => handleInputChange('ai_model', e.target.value)}
                    placeholder="qwen-flash"
                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white bg-white dark:bg-zinc-900 text-slate-900 dark:text-white transition-all outline-none"
                  />
                </div>

                <div className="h-px bg-slate-100 dark:bg-zinc-800 my-6"></div>

                {/* Optimize Prompt */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors">
                      润色模式提示词
                    </label>
                    <button
                      type="button"
                      onClick={() => handleInputChange('ai_prompt_optimize', defaultOptimizePrompt)}
                      className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-gray-300 rounded-md transition-colors"
                    >
                      恢复默认
                    </button>
                  </div>
                  <textarea
                    value={settings.ai_prompt_optimize}
                    onChange={(e) => handleInputChange('ai_prompt_optimize', e.target.value)}
                    placeholder={defaultOptimizePrompt}
                    rows={6}
                    className="w-full px-4 py-3 text-xs border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white bg-white dark:bg-zinc-900 text-slate-700 dark:text-gray-300 font-mono transition-all outline-none resize-y"
                  />
                  <p className="mt-2 text-xs text-slate-400 dark:text-gray-500">
                    提示词中需要含有 <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-slate-600 dark:text-gray-300 font-mono">{'${text}'}</code>。
                    
                  </p>
                </div>

                {/* Command Prompt */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors">
                      指令模式提示词
                    </label>
                    <button
                      type="button"
                      onClick={() => handleInputChange('ai_prompt_command', defaultCommandPrompt)}
                      className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-gray-300 rounded-md transition-colors"
                    >
                      恢复默认
                    </button>
                  </div>
                  <textarea
                    value={settings.ai_prompt_command}
                    onChange={(e) => handleInputChange('ai_prompt_command', e.target.value)}
                    placeholder={defaultCommandPrompt}
                    rows={6}
                    className="w-full px-4 py-3 text-xs border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white bg-white dark:bg-zinc-900 text-slate-700 dark:text-gray-300 font-mono transition-all outline-none resize-y"
                  />
                  <p className="mt-2 text-xs text-slate-400 dark:text-gray-500">
                    提示词中需要含有 <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-slate-600 dark:text-gray-300 font-mono">{'${selectedText}'}</code> 和 <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-slate-600 dark:text-gray-300 font-mono">{'${text}'}</code>
                  </p>
                </div>

                {/* Ask Prompt */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors">
                      提问模式提示词
                    </label>
                    <button
                      type="button"
                      onClick={() => handleInputChange('ai_prompt_ask', defaultAskPrompt)}
                      className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-gray-300 rounded-md transition-colors"
                    >
                      恢复默认
                    </button>
                  </div>
                  <textarea
                    value={settings.ai_prompt_ask}
                    onChange={(e) => handleInputChange('ai_prompt_ask', e.target.value)}
                    placeholder={defaultAskPrompt}
                    rows={6}
                    className="w-full px-4 py-3 text-xs border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white bg-white dark:bg-zinc-900 text-slate-700 dark:text-gray-300 font-mono transition-all outline-none resize-y"
                  />
                  <p className="mt-2 text-xs text-slate-400 dark:text-gray-500">
                    提示词中需要含有 <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-slate-600 dark:text-gray-300 font-mono">{'${text}'}</code>
                    ，可选变量：<code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-slate-600 dark:text-gray-300 font-mono">{'${selectedText}'}</code>（选中的文本）
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 底部操作栏 */}
          <div className="flex flex-col gap-4">
             {/* 测试结果显示 */}
              {testResult && (
                <div className={`p-4 rounded-xl border ${
                  testResult.available
                    ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-800'
                    : 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800'
                } animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {testResult.available ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`font-semibold text-sm ${
                      testResult.available
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {testResult.available ? 'AI配置测试成功' : 'AI配置测试失败'}
                    </span>
                  </div>
                  
                  {testResult.available && (
                    <div className="ml-7 space-y-1">
                      {testResult.model && (
                        <p className="text-xs text-green-700 dark:text-green-300">
                          <strong>模型:</strong> {testResult.model}
                        </p>
                      )}
                      {testResult.response && (
                        <p className="text-xs text-green-700 dark:text-green-300 line-clamp-2">
                          <strong>回复:</strong> {testResult.response}
                        </p>
                      )}
                    </div>
                  )}
                  {!testResult.available && testResult.error && (
                     <p className="ml-7 text-xs text-red-700 dark:text-red-300">
                        {testResult.error}
                     </p>
                  )}
                </div>
              )}
            
            <div className="flex items-center gap-3">
              <button
                onClick={testAIConfiguration}
                disabled={testing}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-gray-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 focus:ring-2 focus:ring-slate-200 dark:focus:ring-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>测试中...</span>
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    <span>测试AI连接</span>
                  </>
                )}
              </button>
              
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex-[2] py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-medium text-sm shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>保存所有设置</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
