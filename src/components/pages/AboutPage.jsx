import React, { useState, useEffect } from "react";
import logo from "../../assets/logo.png";
import { Github, Globe, Mail, Shield, Zap, Mic, Code, Heart, Coffee } from "lucide-react";

export const AboutPage = ({ isEmbedded = false }) => {
  const [version, setVersion] = useState("1.0.0");
  
  useEffect(() => {
    const getVersion = async () => {
      if (window.electronAPI && window.electronAPI.getAppVersion) {
        try {
          const ver = await window.electronAPI.getAppVersion();
          setVersion(ver);
        } catch (e) {
          console.error("Failed to get app version", e);
        }
      } else if (window.constants && window.constants.VERSION) {
        setVersion(window.constants.VERSION);
      }
    };
    getVersion();
  }, []);

  const openExternalLink = (url) => {
    // Check if we have an API to open external links, otherwise window.open
    // Usually Electron apps block window.open, but let's assume standard behavior or use a specific API if known.
    // Looking at preload.js, I don't see a specific openExternal, but window.open might work or I might need to implement one.
    // For now, let's just use window.open and hope the main process handles it or the preload allows it.
    // Actually, usually in Electron you need shell.openExternal via IPC.
    // I don't see openExternal in preload.js. I'll just use a standard anchor tag with target="_blank" which often gets intercepted by 'new-window' handler in main process.
    window.open(url, '_blank');
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-zinc-900 ${isEmbedded ? 'h-full min-h-0' : ''}`}>
      <div className={`flex flex-col ${isEmbedded ? 'h-full' : 'h-screen'}`}>
        
        {/* Header */}
        <div className={`flex-shrink-0 flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 ${isEmbedded ? 'sticky top-0 z-10' : ''}`}>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            关于
          </h1>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-12 space-y-10">
            
            {/* Hero Section */}
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative w-32 h-32 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl flex items-center justify-center p-2 border border-slate-100 dark:border-zinc-700">
                  <img src={logo} alt="TalkType Logo" className="w-full h-full object-contain rounded-xl" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                  TalkType
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-700">
                    v{version}
                  </span>
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                    开源免费
                  </span>
                </div>
              </div>

              <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                TalkType 是一款基于 Electron 开发的跨平台应用，支持 Windows、macOS 和 Linux 系统。将ASR与LLM结合，不仅能“听写”，更能“理解”、“润色”、“提问”，从而高效产出高质量文本。
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard 
                icon={<Zap className="text-amber-500" />}
                title="AI 优化"
                description="让口语变为书面语，支持指令修改、提问问题、让您的表达逻辑清晰流畅。"
              />
              <FeatureCard 
                icon={<Shield className="text-green-500" />}
                title="隐私保护"
                description="所有配置和历史记录仅存储在本地，API 直接连接服务商，安全无忧。"
              />
            </div>

            {/* Links & Resources */}
            <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe size={20} className="text-slate-400" />
                  资源与链接
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                <LinkItem 
                  icon={<Github size={20} />}
                  label="GitHub 仓库"
                  subLabel="查看源码、提交 Issue 或贡献代码"
                  url="https://github.com/zyk42/TalkType"
                />
              </div>
            </div>

            {/* Footer / Credits */}
            <div className="flex flex-col items-center justify-center space-y-4 pt-8 pb-4">
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
                <span>Created with</span>
                <Heart size={14} className="text-red-500 fill-red-500" />
                <span>by</span>
                <a 
                  href="https://github.com/zyk42" 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  zyk
                </a>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-600">
          
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-white dark:bg-zinc-900/50 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
    <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-4">
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <h3 className="font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
      {description}
    </p>
  </div>
);

const LinkItem = ({ icon, label, subLabel, url }) => (
  <a 
    href={url}
    target="_blank"
    rel="noreferrer"
    className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
  >
    <div className="flex items-center gap-4">
      <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
        {icon}
      </div>
      <div>
        <div className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {label}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {subLabel}
        </div>
      </div>
    </div>
    <div className="text-slate-300 group-hover:text-slate-400">
      →
    </div>
  </a>
);
