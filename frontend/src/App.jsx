import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import DashboardLayout from './layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import GlobalMapPage from './pages/GlobalMapPage';
import NetworkGraphPage from './pages/NetworkGraphPage';
import RiskAnalyticsPage from './pages/RiskAnalyticsPage';
import PredictionsPage from './pages/PredictionsPage';
import { useIntelligenceData } from './hooks/useData';
import IntelligenceBrief from './components/Brief/IntelligenceBrief';

import { LayoutDashboard, Map, Activity, BarChart3, Settings, FileText, Globe, ShieldAlert, Waves, Menu, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
  const { events } = useIntelligenceData();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isBriefOpen, setIsBriefOpen] = React.useState(false);

  const sidebar = (
    <div className={`flex flex-col h-full overflow-hidden ${isSidebarOpen ? 'px-6' : 'px-2'}`}>
      <div className={`py-6 mb-4 flex items-center ${isSidebarOpen ? 'justify-between px-2' : 'flex-col gap-4 justify-center'}`}>
        <div className="flex items-center gap-4 overflow-hidden shrink-0">
          <div className="w-10 h-10 bg-white flex items-center justify-center rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] shrink-0">
            <Waves className="text-[#05080f] w-6 h-6" strokeWidth={2.5} />
          </div>
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-xl font-black tracking-tighter text-white m-0 leading-none">RippleAi</h1>
              <p className="mono text-[7px] uppercase tracking-[0.3em] text-slate-500 font-bold m-0 mt-1">Intel Core</p>
            </motion.div>
          )}
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-90"
        >
          <Menu size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-2 mt-2">
        {isSidebarOpen && <div className="mono text-[9px] font-black tracking-[0.3em] text-slate-600 mb-4 px-3">NAVIGATION</div>}

        
        {[
          { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
          { to: "/map", label: "Global Disruption Matrix", icon: Map },
          { to: "/graph", label: "Network Graph", icon: Globe },
          { to: "/predictions", label: "Predictive Analytics", icon: BrainCircuit },
          { to: "/analytics", label: "Risk Matrix", icon: BarChart3 },
        ].map((item) => (
          <NavLink 
            key={item.to}
            to={item.to} 
            end={item.end}
            className={({ isActive }) => `
              group flex items-center ${isSidebarOpen ? 'gap-4 px-4' : 'justify-center'} py-3 rounded-lg transition-all duration-300 relative overflow-hidden
              ${isActive 
                ? 'bg-white/5 text-white border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
                : 'text-slate-500 hover:text-white hover:bg-white/[0.02] border border-transparent'}
            `}
          >
            {({ isActive }) => (
              <>

                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={`${isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'} shrink-0`} />
                {isSidebarOpen && (
                  <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`text-sm font-bold tracking-tight ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'}`}>
                    {item.label}
                  </motion.span>
                )}
                {/* Active Indicator Glow Bar */}
                <div 
                  className={`
                    absolute left-0 w-1 h-1/2 bg-primary rounded-r-full transition-all duration-500
                    ${isActive ? 'opacity-100 shadow-[0_0_15px_#3b82f6]' : 'opacity-0'}
                  `}
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>


      <div className="mt-auto pt-8 border-t border-white/5 space-y-2">
        <a className={`group flex items-center ${isSidebarOpen ? 'gap-4 px-4' : 'justify-center'} py-3 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.02] transition-all duration-300 cursor-pointer border border-transparent`}>
          <Settings size={18} className="group-hover:rotate-45 transition-transform shrink-0" />
          {isSidebarOpen && (
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-sm font-bold tracking-tight">System Configuration</motion.span>
          )}
        </a>
        <button 
          onClick={() => setIsBriefOpen(true)}
          className={`w-full mt-4 bg-white/90 text-[#05080f] font-black ${isSidebarOpen ? 'py-3.5 px-4' : 'py-3.5 px-0 justify-center'} rounded-lg text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-95 transition-all flex items-center gap-2 border border-white/20 group overflow-hidden`}
        >
            <FileText size={18} className="group-hover:scale-110 transition-transform shrink-0" />
            {isSidebarOpen && (
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>Generate Brief</motion.span>
            )}
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar} isSidebarOpen={isSidebarOpen}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/map" element={<GlobalMapPage />} />
        <Route path="/graph" element={<NetworkGraphPage />} />
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/analytics" element={<RiskAnalyticsPage />} />
      </Routes>
      <IntelligenceBrief isOpen={isBriefOpen} onClose={() => setIsBriefOpen(false)} />
    </DashboardLayout>
  );
}

export default App;
