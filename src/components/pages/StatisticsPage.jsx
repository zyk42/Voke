import React, { useState, useEffect } from 'react';

const StatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!window.electronAPI) return;
    
    try {
      setLoading(true);
      const data = await window.electronAPI.getStatistics();
      setStats(data);
    } catch (error) {
      console.error("加载统计数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
        <span className="ml-3 text-slate-600 dark:text-gray-400">加载统计数据...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-gray-400">
        暂无统计数据
      </div>
    );
  }

  const { basic, types, languages } = stats;

  const StatCard = ({ title, value, unit = '', subtext = '' }) => (
    <div className="bg-white dark:bg-black p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
      <div className="text-sm text-slate-500 dark:text-gray-400 mb-1">{title}</div>
      <div className="flex items-baseline">
        <span className="text-2xl font-semibold text-slate-800 dark:text-gray-100">{value}</span>
        {unit && <span className="ml-1 text-sm text-slate-500 dark:text-gray-400">{unit}</span>}
      </div>
      {subtext && <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">{subtext}</div>}
    </div>
  );

  const SectionTitle = ({ children, emoji }) => (
    <h3 className="text-lg font-medium text-slate-800 dark:text-gray-200 mb-4 flex items-center">
      <span className="mr-2 text-xl">{emoji}</span>
      {children}
    </h3>
  );

  return (
    <div className="space-y-8 pb-8">
      {/* 基础数据 */}
      <section>
        <SectionTitle emoji="📊">基础数据</SectionTitle>
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="总转录次数" value={basic.total_count} />
          <StatCard title="总转录时间" value={basic.total_duration.toFixed(1)} unit="秒" />
          <StatCard title="总转录字数" value={basic.total_word_count} />
          <StatCard title="总使用天数" value={basic.total_days} unit="天" />
        </div>
      </section>

      {/* 进阶数据 */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100 flex items-center border-b border-slate-100 dark:border-zinc-800 pb-2">
          <span className="mr-2">📈</span>
          进阶数据
        </h2>

        {/* 润色模式 */}
        <section>
          <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-3 uppercase tracking-wider">润色模式 ✨</h4>
          <div className="grid grid-cols-3 gap-4">
            <StatCard title="总润色次数" value={types.optimize.count} />
            <StatCard title="总润色时间" value={types.optimize.duration.toFixed(1)} unit="秒" />
            <StatCard title="总润色字数" value={types.optimize.word_count} />
          </div>
        </section>

        {/* 指令模式 */}
        <section>
          <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-3 uppercase tracking-wider">指令模式 ⚡</h4>
          <div className="grid grid-cols-3 gap-4">
            <StatCard title="总指令次数" value={types.command.count} />
            <StatCard title="总指令时间" value={types.command.duration.toFixed(1)} unit="秒" />
            <StatCard title="总指令字数" value={types.command.word_count} />
          </div>
        </section>

        {/* 提问模式 */}
        <section>
          <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-3 uppercase tracking-wider">提问模式 ❓</h4>
          <div className="grid grid-cols-3 gap-4">
            <StatCard title="总提问次数" value={types.ask.count} />
            <StatCard title="总提问时间" value={types.ask.duration.toFixed(1)} unit="秒" />
            <StatCard title="总提问字数" value={types.ask.word_count} />
          </div>
        </section>

        {/* 语言偏好 */}
        <section>
          <SectionTitle emoji="🌐">语言偏好</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            <StatCard title="使用中文次数" value={languages.chinese} />
            <StatCard title="使用英文次数" value={languages.english} />
            <StatCard title="使用混合语言次数" value={languages.mixed} />
          </div>
        </section>
      </div>
    </div>
  );
};

export default StatisticsPage;
