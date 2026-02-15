import React from "react";
import { Check } from "lucide-react";

const PermissionCard = ({
  icon: Icon,
  title,
  description,
  granted,
  onRequest,
  buttonText = "授予权限",
}) => {
  return (
    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-black shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-lg shrink-0">
            <Icon className="w-5 h-5 text-slate-700 dark:text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate mb-0.5">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{description}</p>
          </div>
        </div>
        
        {granted ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg border border-green-100 dark:border-green-900/30 shrink-0">
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="text-xs font-semibold">已授予</span>
          </div>
        ) : (
          <button
            onClick={onRequest}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black text-xs font-semibold rounded-lg transition-colors shadow-sm shrink-0"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default PermissionCard;
