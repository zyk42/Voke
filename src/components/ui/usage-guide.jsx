import React from 'react';

export const UsageGuide = () => {
  return (
    <section className="bg-white dark:bg-black rounded-2xl p-6 shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-zinc-800 mt-8">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-200 mb-6 border-l-4 border-slate-900 dark:border-white pl-4">使用方式</h3>
      
      <div className="grid gap-6 grid-cols-2 md:grid-cols-4">
        <div className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
            <span className="text-xl">🎤</span>
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">转录模式</h4>
          <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
            文本光标处，长按 Right Alt 说话，松开即可转写为文字。
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">润色模式</h4>
          <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
            开启AI润色，长按 Right Alt 说话，松开即可优化表达，让文字更流畅。
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
            <span className="text-xl">⌨️</span>
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">指令模式</h4>
          <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
            选中文字，长按 Right Alt 说出指令，松开即可精准调整文本内容，满足个性化需求。
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
            <span className="text-xl">💡</span>
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">提问模式</h4>
          <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
            长按 Right Ctrl 说出问题，松开即可得到 AI 回答。
          </p>
        </div>
      </div>
    </section>
  );
};
