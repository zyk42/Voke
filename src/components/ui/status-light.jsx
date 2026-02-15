import React from 'react';

/**
 * 状态灯组件
 * 使用三种颜色的圆形指示灯显示模型状态
 */
export const StatusLight = ({ size = "w-3 h-3", showTooltip = true }) => {
  const lightElement = (
    <div 
      className={`${size} rounded-full bg-green-500 service-ready border border-white/30 shadow-sm`}
    />
  );

  if (!showTooltip) {
    return lightElement;
  }

  return (
    <div className="relative group">
      {lightElement}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-white service-status-tooltip rounded-md whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
        <span className="text-xs font-medium">🟢 云端服务正常</span>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/85"></div>
      </div>
    </div>
  );
};