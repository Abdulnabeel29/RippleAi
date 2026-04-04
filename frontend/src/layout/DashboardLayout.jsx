import React from 'react';
import { NavLink } from 'react-router-dom';
import { Waves, Bell, UserCircle, Activity, Search, Command, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../hooks/useNotifications';
import NotificationCenter from '../components/Notifications/NotificationCenter';
import IntelligenceTicker from '../components/Notifications/IntelligenceTicker';

const DashboardLayout = ({ sidebar, children, isSidebarOpen }) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const { count } = useNotifications();

  return (
    <div className="flex h-screen w-full bg-[#05080f] font-sans text-slate-200 overflow-hidden">
      
      {/* Sidebar - Precision Glassmorphic Frame */}
      <motion.div 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 260 : 80,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        className="h-screen flex shrink-0 flex-col bg-[#0a0f1b]/95 backdrop-blur-3xl border-r border-white/5 shadow-[20px_0_80px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
      >
        <div className={`${isSidebarOpen ? 'w-[260px]' : 'w-[80px]'} h-full flex flex-col`}>

        <div className="flex-1 py-4">
          {sidebar}
        </div>

        <div className={`p-6 border-t border-white/5 flex ${isSidebarOpen ? 'items-center justify-start' : 'items-center justify-center'}`}>
          <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-default" title="System v2.4.1 Online">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_#10b981] flex-shrink-0" />
            {isSidebarOpen && <span className="mono text-[9px] uppercase tracking-widest font-bold whitespace-nowrap">System v2.4.1 Online</span>}
          </div>
        </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 relative h-screen overflow-y-auto bg-[#05080f]">
        
        {/* TopNavBar - High-Fidelity Glass HUD */}
        <header className="sticky top-0 z-30 bg-[#05080f]/60 backdrop-blur-xl flex justify-between items-center h-20 px-8 border-b border-white/5 shrink-0 shadow-2xl gap-8">
          
          <div className="flex-1 overflow-hidden">
             <IntelligenceTicker />
          </div>

          <div className="flex items-center gap-8 shrink-0">
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
              <div className="w-2 h-2 rounded-full bg-success animate-marker-pulse shadow-[0_0_10px_#10b981]"></div>
              <span className="mono text-[9px] uppercase tracking-[0.2em] font-black text-white hidden lg:inline-block">System Status: Active</span>
            </div>
            
            <div className="flex items-center gap-5 text-slate-400 relative">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-lg transition-all hover:text-white relative ${showNotifications ? 'bg-white/10 text-white shadow-inner' : 'hover:bg-white/5'}`}
                >
                  <Bell size={20} strokeWidth={1.5} />
                  {count > 0 && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-[#05080f] animate-pulse shadow-[0_0_8px_#ef4444]" />
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <NotificationCenter 
                      isOpen={showNotifications} 
                      onClose={() => setShowNotifications(false)} 
                    />
                  )}
                </AnimatePresence>
              </div>

              <button className="p-2 hover:bg-white/5 rounded-lg transition-all hover:text-white">
                <UserCircle size={22} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;
