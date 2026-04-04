import React, { useState, useMemo } from 'react';
import ImpactSimulationView from '../components/Simulation/ImpactSimulationView';
import { useIntelligenceData, useEventSimulation } from '../hooks/useData';
import { motion } from 'framer-motion';
import { BarChart3, Activity, ShieldAlert, Cpu, Layers, AlertTriangle } from 'lucide-react';


const RiskAnalyticsPage = () => {
  const { events, predictions, loading } = useIntelligenceData();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { simulationData, impactData } = useEventSimulation(selectedEvent?.id);

  const handleEventSelect = (evt) => {
    if (selectedEvent?.id === evt.id) setSelectedEvent(null);
    else setSelectedEvent(evt);
  };

  const severityBreakdown = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    events.forEach(e => {
      const s = e.severity?.toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [events]);

  const typeBreakdown = useMemo(() => {
    const counts = {};
    events.forEach(e => {
      const t = e.event_type || 'unknown';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [events]);

  return (
    <div className="flex flex-col gap-12 p-8 md:p-12 bg-[#05080f]">
      
      {/* HUD Page Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 border-l-2 border-primary/20 pl-8 relative">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <BarChart3 size={24} className="text-primary" />
             </div>
             <div className="flex flex-col">
                <h2 className="text-4xl font-black text-white tracking-tighter m-0 uppercase italic">
                  Risk Analytics Matrix
                </h2>
                <div className="flex items-center gap-2">
                   <span className="mono text-[9px] font-black tracking-extreme text-primary/60 uppercase">Structural_Intelligence_v4.2</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_#10b981]" />
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-10">
           <div className="flex flex-col items-end">
              <span className="mono text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-1">Global Health Index</span>
              <div className="flex items-center gap-2">
                 <span className="text-2xl font-black text-white tracking-tighter italic">NOMINAL</span>
                 <Activity size={16} className="text-success" />
              </div>
           </div>
           <div className="w-px h-10 bg-white/10 hidden lg:block" />
           <div className="flex flex-col items-end">
              <span className="mono text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-1">Active Scenarios</span>
              <span className="text-2xl font-black text-white tracking-tighter italic">{events.length.toString().padStart(3, '0')}</span>
           </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Severity Distribution Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-10 rounded-2xl border border-white/5 relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-8">
             <ShieldAlert size={18} className="text-primary" />
             <h3 className="mono text-xs font-black uppercase tracking-[0.2em] text-white/80 m-0">Severity Propulsion Matrix</h3>
          </div>
          
          <div className="flex flex-col gap-6 relative z-10">
            {[
              { label: 'Critical', key: 'critical', color: 'bg-danger shadow-[0_0_15px_#ef4444]', icon: AlertTriangle },
              { label: 'High Risk', key: 'high', color: 'bg-orange-500 shadow-[0_0_15px_#f97316]', icon: Layers },
              { label: 'Medium', key: 'medium', color: 'bg-warning shadow-[0_0_15px_#f59e0b]', icon: Activity },
              { label: 'Standard', key: 'low', color: 'bg-success shadow-[0_0_15px_#10b981]', icon: ShieldAlert },
            ].map(({ label, key, color, icon: Icon }) => {
              const count = severityBreakdown[key] || 0;
              const pct = events.length > 0 ? (count / events.length) * 100 : 0;
              return (
                <div key={key} className="flex flex-col gap-2 group">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                       <Icon size={12} className="text-white/20 group-hover:text-white transition-colors" />
                       <span className="text-[10px] font-black text-white/50 uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
                    </div>
                    <span className="mono text-[10px] text-white/40 font-black">{count.toString().padStart(2, '0')}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                      className={`h-full rounded-full ${color}`} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Background Decoration */}
          <div className="absolute -right-10 -bottom-10 opacity-[0.03]">
             <ShieldAlert size={200} />
          </div>
        </motion.div>

        {/* Type Breakdown Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-10 rounded-2xl border border-white/5 relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-8">
             <Cpu size={18} className="text-primary" />
             <h3 className="mono text-xs font-black uppercase tracking-[0.2em] text-white/80 m-0">Event Vector Classification</h3>
          </div>

          <div className="flex flex-col gap-6 relative z-10">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                <Activity size={32} className="animate-pulse" />
                <span className="mono text-[10px] font-black uppercase tracking-widest">Compiling Data...</span>
              </div>
            ) : typeBreakdown.map(([type, count]) => (
              <div key={type} className="flex flex-col gap-2 group">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest group-hover:text-white transition-colors capitalize">{type.replace(/_/g, ' ')}</span>
                  <span className="mono text-[10px] text-white/40 font-black">{count.toString().padStart(2, '0')}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / events.length) * 100}%` }}
                    transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full bg-primary shadow-[0_0_15px_#3b82f6] rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Background Decoration */}
          <div className="absolute -right-10 -bottom-10 opacity-[0.03]">
             <Layers size={200} />
          </div>
        </motion.div>
      </div>

      {/* Interactive HUD Overlays */}
      <ImpactSimulationView
        event={selectedEvent}
        simulationData={simulationData}
        impactData={impactData}
        onClose={() => setSelectedEvent(null)}
      />
      
      {/* Footer Decoration */}
      <div className="mt-20 pt-8 border-t border-white/5 flex justify-between items-center opacity-30">
        <span className="mono text-[8px] font-black uppercase tracking-[0.5em]">System Stability::99.99%</span>
        <div className="flex gap-2">
           {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 rounded-full bg-white/20" />)}
        </div>
        <span className="mono text-[8px] font-black uppercase tracking-[0.5em]">Session::0x82A1LK</span>
      </div>
    </div>
  );
};

export default RiskAnalyticsPage;
