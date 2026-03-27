import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import DashboardLayout from './layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import GlobalMapPage from './pages/GlobalMapPage';
import NetworkGraphPage from './pages/NetworkGraphPage';
import RiskAnalyticsPage from './pages/RiskAnalyticsPage';
import { useIntelligenceData } from './hooks/useData';

function App() {
  const { events } = useIntelligenceData();

  const sidebar = (
    <div className="flex flex-col h-full">
      <nav className="flex-1 space-y-1">
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 cursor-pointer ${isActive ? 'text-white font-semibold border-r-2 border-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span className="font-['Inter'] font-medium text-sm tracking-tight">Overview</span>
        </NavLink>
        <NavLink 
          to="/map" 
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 cursor-pointer ${isActive ? 'text-white font-semibold border-r-2 border-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <span className="material-symbols-outlined text-[20px]">map</span>
          <span className="font-['Inter'] font-medium text-sm tracking-tight">Global Risk Map</span>
        </NavLink>
        <NavLink 
          to="/graph" 
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 cursor-pointer ${isActive ? 'text-white font-semibold border-r-2 border-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <span className="material-symbols-outlined text-[20px]">hub</span>
          <span className="font-['Inter'] font-medium text-sm tracking-tight">Network Graph</span>
        </NavLink>
        <NavLink 
          to="/analytics" 
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 cursor-pointer ${isActive ? 'text-white font-semibold border-r-2 border-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <span className="material-symbols-outlined text-[20px]">analytics</span>
          <span className="font-['Inter'] font-medium text-sm tracking-tight">Risk Analytics</span>
        </NavLink>
      </nav>

      <div className="mt-8 flex flex-col gap-5 pt-6 border-t border-white/5">
        <div className="flex flex-col gap-1">
          <h4 className="mono text-[10px] m-0 text-slate-500 uppercase tracking-widest">TOTAL SCENARIOS</h4>
          <div className="text-2xl font-bold text-white leading-none">{events?.length || 0}</div>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="mono text-[10px] m-0 text-slate-500 uppercase tracking-widest">CRITICAL RISKS</h4>
          <div className="text-2xl font-bold text-danger leading-none">
            {events?.filter(e => e.severity?.toLowerCase() === 'high' || e.severity?.toLowerCase() === 'critical').length || 0}
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-6 border-t border-white/5 space-y-1">
        <a className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer">
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span className="font-['Inter'] font-medium text-sm tracking-tight">Settings</span>
        </a>
        <button className="w-full mt-4 bg-primary text-black font-bold py-2.5 rounded-sm text-xs uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all">
            Generate Report
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/map" element={<GlobalMapPage />} />
        <Route path="/graph" element={<NetworkGraphPage />} />
        <Route path="/analytics" element={<RiskAnalyticsPage />} />
      </Routes>
    </DashboardLayout>
  );
}

export default App;
