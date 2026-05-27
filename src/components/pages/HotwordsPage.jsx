import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Info } from "lucide-react";

export const HotwordsPage = () => {
  const [hotwords, setHotwords] = useState([]);
  const [newHotword, setNewHotword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHotwords();
    
    // 监听 IPC 热词添加事件（如果有其他来源）
    let cleanup = null;
    if (window.electronAPI && window.electronAPI.onHotwordAdded) {
      cleanup = window.electronAPI.onHotwordAdded((result) => {
        if (result.success) {
          loadHotwords();
        }
      });
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const loadHotwords = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.getHotwords();
      if (result && result.success) {
        setHotwords(result.hotwords || []);
      } else {
        console.error("加载热词失败:", result?.error);
      }
    } catch (error) {
      console.error("加载热词出错:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHotword = async (e) => {
    e.preventDefault();
    if (!newHotword.trim()) return;

    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.addHotword(newHotword);
      if (result && result.success) {
        toast.success("热词添加成功");
        setNewHotword("");
        loadHotwords();
      } else {
        toast.error(result?.error || "添加失败");
      }
    } catch (error) {
      console.error("添加热词出错:", error);
      toast.error("添加热词出错");
    }
  };

  const handleDeleteHotword = async (id) => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.deleteHotword(id);
      if (result && result.success) {
        toast.success("热词删除成功");
        loadHotwords();
      } else {
        toast.error(result?.error || "删除失败");
      }
    } catch (error) {
      console.error("删除热词出错:", error);
      toast.error("删除热词出错");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-900 flex flex-col h-screen">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200/60 dark:border-zinc-800 bg-white/80 dark:bg-black/90 backdrop-blur-md shadow-sm">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white chinese-title">热词管理</h1>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* 说明卡片 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">功能说明</p>
              <p>在此添加容易识别错误的多音字、人名、专业术语或英语谐音词。</p>
              <p>系统会在AI润色模式下，自动检查并修正这些词的识别错误。</p>
              <p className="mt-2 text-xs opacity-80">提示：选中任意文本右键也可快速添加到热词。</p>
            </div>
          </div>

          {/* 添加热词表单 */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 p-6">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">添加新热词</h2>
            <form onSubmit={handleAddHotword} className="flex gap-3">
              <input
                type="text"
                value={newHotword}
                onChange={(e) => setNewHotword(e.target.value)}
                placeholder="输入词语，例如：Voke..."
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newHotword.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </form>
          </div>

          {/* 热词列表 */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-700 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-900 dark:text-white">已添加热词 ({hotwords.length})</h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">加载中...</div>
            ) : hotwords.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                暂无热词，请添加
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-700">
                {hotwords.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors">
                    <span className="text-slate-900 dark:text-white font-medium">{item.word}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteHotword(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
