import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, Clock, CheckCircle, Navigation, Terminal, Network, ShieldCheck, Cpu } from 'lucide-react';
import { useDecisionIntelligence } from '../../hooks/useData';

const DecisionPanel = ({ eventId }) => {
  const { decisionData, loading } = useDecisionIntelligence(eventId);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0 }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full bg-transparent p-6 overflow-y-auto border-l border-white/5 custom-scrollbar gap-8">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Cpu size={16} className="text-primary animate-pulse" />
            <h3 className="text-[10px] mono font-black text-white/50 uppercase tracking-[0.2em] m-0">Decision Engine Array</h3>
        </div>

        {/* Header skeleton */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse shadow-[0_0_8px_#3b82f6]" />
            <div className="h-2 w-32 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="h-2 w-full bg-white/[0.03] rounded animate-pulse" />
          <div className="h-2 w-5/6 bg-white/[0.03] rounded animate-pulse" />
          <div className="h-2 w-4/6 bg-white/[0.02] rounded animate-pulse" />
        </div>

        {/* Impact cards skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col gap-3">
            <div className="h-2 w-24 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col gap-3">
            <div className="h-2 w-24 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
          </div>
        </div>

        {/* Timeline skeleton */}
        <div className="flex flex-col gap-4">
          <div className="h-2 w-32 bg-white/10 rounded animate-pulse" />
          <div className="border-l-2 border-white/5 ml-2 pl-6 flex flex-col gap-6 relative before:absolute before:left-[-2px] before:top-0 before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-white/10 before:to-transparent">
            {[0, 1, 2].map(i => (
              <div key={i} className="relative flex flex-col gap-2.5">
                <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 rounded-full bg-white/10 animate-pulse border-2 border-[#05080f]" />
                <div className="h-2 w-1/2 bg-white/10 rounded animate-pulse" />
                <div className="h-2 w-full bg-white/[0.03] rounded animate-pulse" />
                <div className="h-2 w-3/4 bg-white/[0.02] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Synthesizing label */}
        <div className="flex items-center justify-center gap-3 mt-auto pt-6 border-t border-white/5 opacity-50">
          <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[8px] mono font-black tracking-[0.3em] text-white uppercase">Synthesizing Intel…</span>
          <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} className="w-1.5 h-1.5 rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  if (!decisionData) {
    return (
      <div className="flex flex-col h-full w-full bg-transparent p-8 items-center justify-center text-center border-l border-white/5">
        <div className="w-16 h-16 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
           <AlertTriangle size={24} className="text-warning" />
        </div>
        <h3 className="text-[10px] mono uppercase tracking-[0.3em] font-black text-white/50 mb-2">Engine Offline</h3>
        <p className="text-xs text-white/30 max-w-[200px] leading-relaxed italic">
          Decision engine response failed. Verify connection to Intelligence Layer.
        </p>
      </div>
    );
  }

  const intelligence = decisionData?.intelligence || decisionData;

  const {
    narrative_explanation,
    impact_analysis,
    time_based_impact,
    action_recommendations
  } = intelligence;

  const industries = Array.isArray(impact_analysis?.affected_industries)
    ? impact_analysis.affected_industries
    : typeof impact_analysis?.affected_industries === 'string'
    ? [impact_analysis.affected_industries]
    : ['Logistics & Freight', 'Manufacturing', 'Trade'];

  return (
    <div className="flex flex-col h-full w-full bg-transparent p-6 overflow-y-auto border-l border-white/5 custom-scrollbar">
      
      <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4 px-2 mb-6 sticky top-0 bg-[#05080f]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
             <Cpu size={14} className="text-primary" />
             <h3 className="text-[9px] mono font-black text-white/60 uppercase tracking-[0.3em] m-0">Decision Engine</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-success/10 border border-success/20 px-2 py-0.5 rounded">
             <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
             <span className="text-[7px] mono font-black text-success uppercase tracking-widest">Active</span>
          </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-8 px-2 pb-6"
      >
        {/* Narrative Section */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3 relative group">
          <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-primary/20" />
          <h3 className="flex items-center gap-2 text-[10px] mono font-black tracking-widest text-primary uppercase">
            <Terminal size={12} /> Exec Brief
          </h3>
          <p className="text-xs text-white/70 leading-relaxed italic font-medium m-0 p-3 bg-white/[0.02] border border-white/5 rounded-lg group-hover:border-white/10 transition-colors">
            "{narrative_explanation || '—'}"
          </p>
        </motion.div>

        {/* Impact Analysis Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-white/5 hover:bg-white/[0.04] transition-colors flex flex-col justify-between group">
            <span className="flex items-center gap-2 text-[8px] mono font-black tracking-widest text-white/40 mb-3 uppercase">
              <Network size={10} className="text-warning group-hover:scale-110 transition-transform" /> Sectors
            </span>
            <div className="flex flex-wrap gap-1.5">
              {industries.map(ind => (
                  <span key={ind} className="text-[9px] font-black bg-white/5 text-white/80 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-tighter truncate max-w-full">
                      {ind}
                  </span>
              ))}
            </div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-white/5 hover:bg-white/[0.04] transition-colors flex flex-col justify-between group">
            <span className="flex items-center gap-2 text-[8px] mono font-black tracking-widest text-white/40 mb-3 uppercase">
              <Clock size={10} className="text-danger group-hover:scale-110 transition-transform" /> Est Delay
            </span>
            <div className="text-sm text-white font-black uppercase tracking-tighter">
              {impact_analysis?.estimated_delay_timeline || '—'}
            </div>
          </div>
        </motion.div>

        {/* Time-Based Impact Timeline */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <h3 className="text-[9px] mono font-black tracking-widest text-white/50 uppercase">
            Ripple Horizon
          </h3>
          <div className="flex flex-col border-l-2 border-white/5 ml-2 pl-6 gap-6 relative before:absolute before:left-[-2px] before:top-0 before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-white/10 before:to-transparent">
            
            <div className="relative group">
              <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 rounded-full bg-danger border-[3px] border-[#05080f] shadow-[0_0_10px_rgba(239,68,68,0.4)] group-hover:scale-125 transition-transform" />
              <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-black text-white uppercase tracking-tighter">Immediate <span className="text-white/30 text-[9px] ml-1">0-3d</span></div>
                  <div className="text-xs text-white/50 leading-relaxed">{time_based_impact?.immediate || '—'}</div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 rounded-full bg-warning border-[3px] border-[#05080f] shadow-[0_0_10px_rgba(245,158,11,0.4)] group-hover:scale-125 transition-transform" />
              <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-black text-white uppercase tracking-tighter">Short Term <span className="text-white/30 text-[9px] ml-1">3-7d</span></div>
                  <div className="text-xs text-white/50 leading-relaxed">{time_based_impact?.short_term || '—'}</div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-[3px] border-[#05080f] shadow-[0_0_10px_rgba(59,130,246,0.4)] group-hover:scale-125 transition-transform" />
              <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-black text-white uppercase tracking-tighter">Medium Term <span className="text-white/30 text-[9px] ml-1">7-14d</span></div>
                  <div className="text-xs text-white/50 leading-relaxed">{time_based_impact?.medium_term || '—'}</div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Action Recommendations */}
        {Array.isArray(action_recommendations) && action_recommendations.length > 0 && (
          <motion.div variants={itemVariants} className="flex flex-col gap-4 mt-2">
            <h3 className="flex items-center gap-2 text-[9px] mono font-black tracking-widest text-success uppercase">
              <ShieldCheck size={12} /> Recommended Protocols
            </h3>
            <div className="flex flex-col gap-3">
              {action_recommendations.map((action, idx) => (
                <div key={idx} className="flex flex-col gap-2 bg-success/5 border border-success/10 p-4 rounded-xl group hover:bg-success/10 transition-colors relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-success/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_#10b981]" />
                      <span className="text-[11px] font-black text-white uppercase tracking-tighter">{action?.strategy || '—'}</span>
                  </div>
                  <span className="text-xs text-white/60 leading-relaxed group-hover:text-white/80 transition-colors pl-3 border-l border-white/5 ml-0.5">
                    "{action?.operational_suggestion || '—'}"
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
};

export default DecisionPanel;
