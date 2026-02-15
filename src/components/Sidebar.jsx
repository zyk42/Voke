import React from "react";
import { Home, History, Settings, Info, BarChart2 } from "lucide-react";
import logo from "../assets/logo.png";

const Sidebar = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'history', label: '历史', icon: History },
    { id: 'statistics', label: '统计', icon: BarChart2 },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="w-20 bg-slate-50 dark:bg-zinc-900 border-r border-slate-200/60 dark:border-zinc-800 flex flex-col items-center py-6 h-full z-20 backdrop-blur-xl bg-opacity-80 dark:bg-opacity-90 transition-colors duration-300">
      <div className="mb-8 p-2">
        <img src={logo} alt="Logo" className="w-10 h-10 object-contain hover:scale-105 transition-transform duration-300 drop-shadow-sm" />
      </div>
      
      <nav className="flex-1 w-full px-3 space-y-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-slate-200/50 dark:ring-white/10" 
                  : "text-slate-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-gray-200"
              }`}
              title={item.label}
            >
              <Icon className={`w-5 h-5 mb-1.5 transition-all duration-300 ${isActive ? 'scale-100 stroke-[2.5px]' : 'scale-90 group-hover:scale-100 stroke-[2px]'}`} />
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'opacity-100 font-semibold' : 'opacity-80'}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="mt-auto w-full px-3 pb-3">
        <button
          onClick={() => onTabChange('about')}
          className={`w-full flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300 group ${
            activeTab === 'about'
              ? "bg-white dark:bg-black text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
              : "text-slate-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-gray-200"
          }`}
          title="关于"
        >
          <Info className={`w-5 h-5 mb-1.5 transition-all duration-300 ${activeTab === 'about' ? 'scale-100 stroke-[2.5px]' : 'scale-90 group-hover:scale-100 stroke-[2px]'}`} />
          <span className={`text-[10px] font-medium tracking-wide ${activeTab === 'about' ? 'opacity-100 font-semibold' : 'opacity-80'}`}>关于</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
