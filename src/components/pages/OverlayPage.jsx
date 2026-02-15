import React, { useEffect, useState } from 'react';

const OverlayPage = () => {
  const [mode, setMode] = useState('idle');

  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onOverlayStateUpdate((state) => {
        setMode(state.mode);
      });
      return cleanup;
    }
  }, []);

  if (mode === 'idle') return null;

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      {mode === 'recording' && <Waveform />}
      {mode === 'processing' && <Spinner />}
    </div>
  );
};

const Waveform = () => (
  <>
    <style>{`
      @keyframes wave {
        0%, 100% { height: 20%; opacity: 0.3; }
        50% { height: 80%; opacity: 1; }
      }
      .animate-wave {
        animation: wave 1s infinite ease-in-out;
      }
    `}</style>
    <div className="flex items-center gap-2 h-16 bg-white/95 dark:bg-black/95 backdrop-blur-xl px-8 py-2 rounded-full border border-slate-200/50 dark:border-zinc-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:ring-white/5">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="w-1.5 bg-slate-900 dark:bg-white rounded-full animate-wave"
          style={{
            animationDelay: `${i * 0.08}s`
          }}
        />
      ))}
      <span className="text-slate-900 dark:text-white text-sm font-medium ml-3 tracking-widest uppercase">正在聆听</span>
    </div>
  </>
);

const Spinner = () => (
  <div className="flex items-center gap-3 bg-white/95 dark:bg-black/95 backdrop-blur-xl px-8 py-4 rounded-full border border-slate-200/50 dark:border-zinc-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:ring-white/5">
     <div className="flex gap-1.5">
       <div className="w-2 h-2 bg-slate-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
       <div className="w-2 h-2 bg-slate-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
       <div className="w-2 h-2 bg-slate-900 dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
     </div>
     <span className="text-slate-900 dark:text-white text-sm font-medium ml-2 tracking-widest uppercase">AI 思考中</span>
  </div>
);

export default OverlayPage;
