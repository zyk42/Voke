import React from "react";
import { toast } from "sonner";
// import "./index.css"; // Moved to App.jsx or main entry

// 历史记录页面组件
export const HistoryPage = ({ isEmbedded = false }) => {
  const handleCopy = async (text) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.copyText(text);
        toast.success('文本已复制到剪贴板');
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('文本已复制到剪贴板');
      }
    } catch (error) {
      console.error("复制失败:", error);
      toast.error('复制失败');
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeHistoryWindow();
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-zinc-900 ${isEmbedded ? 'h-full min-h-0' : ''}`}>
      {/* 使用历史记录组件，但作为全屏页面而不是模态框 */}
      <div className={`flex flex-col ${isEmbedded ? 'h-full' : 'h-screen'}`}>
        {/* 标题栏 */}
        <div className={`flex items-center justify-between px-6 py-3 border-b border-slate-200/60 dark:border-zinc-800 bg-white/80 dark:bg-black/90 backdrop-blur-md shadow-sm ${isEmbedded ? 'sticky top-0 z-10' : ''}`}>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white chinese-title">转录历史</h1>
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

        {/* 历史记录内容 */}
        <div className="flex-1 overflow-hidden">
          <HistoryContent onCopy={handleCopy} />
        </div>
      </div>
    </div>
  );
};

// 历史记录内容组件
const HistoryContent = ({ onCopy }) => {
  const [transcriptions, setTranscriptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filteredTranscriptions, setFilteredTranscriptions] = React.useState([]);
  const [totalCount, setTotalCount] = React.useState(0);

  // 加载转录历史
  const loadTranscriptions = async () => {
    if (!window.electronAPI) return;
    
    setLoading(true);
    try {
      // 限制只获取最近50条记录
      const result = await window.electronAPI.getTranscriptions(50, 0);
      setTranscriptions(result || []);
      setFilteredTranscriptions(result || []);

      // 获取总记录数
      const stats = await window.electronAPI.getTranscriptionStats();
      if (stats) {
        setTotalCount(stats.total || stats.basic?.total_count || 0);
      }
    } catch (error) {
      console.error("加载历史记录失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索功能
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTranscriptions(transcriptions);
    } else {
      const filtered = transcriptions.filter(item => 
        item.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.processed_text?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTranscriptions(filtered);
    }
  }, [searchQuery, transcriptions]);

  // 组件挂载时加载数据
  React.useEffect(() => {
    loadTranscriptions();
  }, []);

  // 删除转录记录
  const handleDelete = async (id) => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI.deleteTranscription(id);
      setTranscriptions(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("删除记录失败:", error);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return "";

    let date;
    // 检查是否是 SQLite 的 UTC 格式 (YYYY-MM-DD HH:MM:SS) 且不带时区信息
    // 这种情况下需要将其视为 UTC 时间处理
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
      date = new Date(dateString.replace(' ', 'T') + 'Z');
    } else {
      date = new Date(dateString);
    }

    const now = new Date();
    
    // 计算日期差异（基于本地时间）
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
                    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && 
                        date.getMonth() === yesterday.getMonth() && 
                        date.getFullYear() === yesterday.getFullYear();

    // 格式化时间部分 (HH:mm)
    const timeStr = date.toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (isToday) {
      return `今天 ${timeStr}`;
    } else if (isYesterday) {
      return `昨天 ${timeStr}`;
    } else {
      // 检查是否是今年
      const isThisYear = date.getFullYear() === now.getFullYear();
      
      if (isThisYear) {
        return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
      } else {
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 搜索栏 */}
      <div className="p-6 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索转录内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 chinese-text text-lg shadow-sm transition-all"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-gray-400 flex items-center">
              共 {searchQuery ? filteredTranscriptions.length : totalCount} 条记录
              <span className="mx-2 text-slate-300 dark:text-zinc-700">|</span>
              <span className="text-blue-600 dark:text-blue-400">仅显示最近50条，如需查看全部请导出</span>
            </span>
            <button
              onClick={() => {
                if (window.electronAPI) {
                  window.electronAPI.exportTranscriptions('json');
                }
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white rounded-lg transition-colors text-sm font-medium shadow-sm hover:shadow-md"
            >
              导出全部
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-20">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
              <span className="ml-3 text-slate-600 dark:text-gray-400">加载中...</span>
            </div>
          ) : filteredTranscriptions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-slate-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 dark:text-gray-400 chinese-text text-lg">
                {searchQuery ? "没有找到匹配的记录" : "暂无转录历史"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTranscriptions.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-black rounded-xl p-6 shadow-[0_2px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all border border-slate-100 dark:border-zinc-800"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 text-sm text-slate-500 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(item.created_at)}</span>
                      {typeof item.confidence === 'number' && item.confidence > 0 && (
                        <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-gray-300 px-2 py-1 rounded text-xs border border-slate-200 dark:border-zinc-800">
                          置信度: {Math.round(item.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onCopy(item.processed_text || item.text)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="复制文本"
                      >
                        <svg className="w-4 h-4 text-slate-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="删除记录"
                      >
                        <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 最终文本 */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-800 dark:text-gray-200 mb-2">最终结果:</h4>
                    <p className="chinese-content leading-relaxed bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/50 dark:border-zinc-800">
                      {item.text}
                    </p>
                  </div>

                  {/* AI优化文本 */}
                  {item.processed_text && item.processed_text.trim() !== (item.raw_text || '').trim() && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">AI优化:</h4>
                      <p className="chinese-content leading-relaxed bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
                        {item.processed_text}
                      </p>
                    </div>
                  )}

                  {/* 原始识别文本 */}
                  {item.raw_text && item.raw_text.trim() !== item.text.trim() && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">原始识别:</h4>
                      <p className="text-xs chinese-content leading-relaxed bg-white dark:bg-black p-3 rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 text-gray-500 dark:text-gray-400">
                        {item.raw_text}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
