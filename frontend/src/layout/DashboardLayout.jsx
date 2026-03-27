import React from 'react';
import { NavLink } from 'react-router-dom';

const DashboardLayout = ({ sidebar, children }) => {
  return (
    <div className="flex h-screen w-full bg-background font-sans text-foreground overflow-hidden">
      
      {/* Sidebar - Fixed Left */}
      <div className="w-[260px] h-screen flex shrink-0 flex-col bg-card border-r border-white/5 shadow-none z-50 overflow-y-auto">
        <div className="px-6 py-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm">
              <span className="material-symbols-outlined text-surface text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>waves</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-white font-['Inter'] m-0 relative top-[2px]">RippleAi</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium m-0">Supply Chain Intelligence</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-2">
          {sidebar}
        </div>

        <div className="p-6 text-center text-xs text-muted-foreground border-t border-white/5">
          System V.2.4.1 Online
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 relative h-screen overflow-y-auto bg-background pb-24">
        
        {/* TopNavBar */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl flex justify-between items-center h-16 px-8 md:px-10 border-b border-white/5 shrink-0">
          <nav className="flex gap-4 md:gap-8 overflow-x-auto">
            <NavLink 
              to="/map" 
              className={({ isActive }) => `font-['Inter'] text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium transition-colors cursor-pointer whitespace-nowrap ${isActive ? 'text-white border-b-2 border-white pb-1' : 'text-slate-500 hover:text-white'}`}
            >
              Global Map
            </NavLink>
            <NavLink 
              to="/graph" 
              className={({ isActive }) => `font-['Inter'] text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium transition-colors cursor-pointer whitespace-nowrap ${isActive ? 'text-white border-b-2 border-white pb-1' : 'text-slate-500 hover:text-white'}`}
            >
              Network Graph
            </NavLink>
            <NavLink 
              to="/" 
              end
              className={({ isActive }) => `font-['Inter'] text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium transition-colors cursor-pointer whitespace-nowrap ${isActive ? 'text-white border-b-2 border-white pb-1' : 'text-slate-500 hover:text-white'}`}
            >
              Dashboard
            </NavLink>
            <NavLink 
              to="/analytics" 
              className={({ isActive }) => `font-['Inter'] text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium transition-colors cursor-pointer whitespace-nowrap ${isActive ? 'text-white border-b-2 border-white pb-1' : 'text-slate-500 hover:text-white'}`}
            >
              Risk Analytics
            </NavLink>
          </nav>
          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <span className="font-['Inter'] text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium text-white hidden sm:inline-block">System Status: Active</span>
            </div>
            <div className="flex items-center gap-4 text-slate-500">
              <span className="material-symbols-outlined cursor-pointer hover:text-white transition-colors text-xl">notifications</span>
              <span className="material-symbols-outlined cursor-pointer hover:text-white transition-colors text-xl">account_circle</span>
            </div>
          </div>
        </header>

        {children}
      </div>

    </div>
  );
};

export default DashboardLayout;
