import React, { useState, useEffect } from 'react';
import { 
  X, 
  Terminal, 
  Activity, 
  Shield, 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Radio,
  Cpu
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../../services/api';

const PredictionDetailView = ({ prediction, onClose }) => {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!prediction) return;

    const loadBrief = async () => {
      // 1. Check if the brief is already baked into the prediction object from the main list
      if (prediction.strategic_brief) {
        try {
          const parsed = typeof prediction.strategic_brief === 'string' 
            ? JSON.parse(prediction.strategic_brief) 
            : prediction.strategic_brief;
          setBrief(parsed);
          setLoading(false);
          return;
        } catch (err) {
          console.warn("Failed to parse pre-calculated brief, falling back to fetch:", err);
        }
      }

      // 2. Fallback to cache-first fetch from backend
      setLoading(true);
      try {
        const data = await api.fetchPredictionBrief(prediction);
        setBrief(data);
      } catch (err) {
        console.error("Failed to load prediction brief:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBrief();
  }, [prediction]);

  if (!prediction) return null;

  const isHigh = prediction.risk_level.toLowerCase() === 'high' || prediction.risk_level.toLowerCase() === 'critical';
  const isMed = prediction.risk_level.toLowerCase() === 'medium';
  
  const styles = {
    accent: isHigh ? 'text-danger' : isMed ? 'text-warning' : 'text-primary',
    pipe: isHigh ? 'status-pipe-red' : isMed ? 'status-pipe-amber' : 'status-pipe-blue',
    label: isHigh ? 'bg-danger/10 text-danger border-danger/20' : isMed ? 'bg-warning/10 text-warning border-warning/20' : 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <Dialog open={!!prediction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] rounded-2xl glass-panel text-white p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col w-[95vw] [&>button]:hidden">
        
        {/* Status indicator line on the left */}
        <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${styles.pipe} z-50`} />

        {/* Animated Inner Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full pointer-events-none" />

        {/* Header Section */}
        <div className="relative border-b border-white/10 bg-white/[0.02] p-8 lg:p-10 shrink-0 z-10 pl-12 lg:pl-14">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <div className={`px-2 py-0.5 rounded text-[8px] font-black mono tracking-[0.2em] uppercase border ${styles.label}`}>
                  {prediction.risk_level} Impact
                </div>
                <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#3b82f6]" />
                  <span className="text-[8px] mono font-black text-primary uppercase tracking-widest">Neural Sync Online</span>
                </div>
              </div>
              <DialogTitle className="text-4xl lg:text-5xl font-black tracking-tighter text-white mb-3 uppercase italic leading-none truncate">
                {prediction.event_type.replace(/_/g, ' ')}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Deep-dive situational intelligence for the predicted {prediction.event_type} in {prediction.location}.
              </DialogDescription>
              <div className="flex items-center gap-4 text-white/40">
                <div className="flex items-center gap-2">
                   <Zap size={14} className={styles.accent} />
                   <span className="text-xs font-bold uppercase tracking-tight text-white/80">{prediction.location}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <div className="flex items-center gap-2">
                   <Cpu size={14} className="text-primary" />
                   <span className="text-xs mono uppercase tracking-widest">Gen-4 Neural Model</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-8">
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                 <span className="text-[10px] text-white/40 mono uppercase tracking-[0.2em] font-black">Forecast Confidence</span>
                 <div className="flex items-center gap-3">
                   <span className="text-4xl font-black text-white tracking-tighter italic leading-none">{(prediction.probability * 100).toFixed(1)}%</span>
                 </div>
                 <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden mt-1 p-[1px] border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.probability * 100}%` }}
                      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                      className={`h-full rounded-full ${styles.accent.split('-')[1] === 'danger' ? 'bg-danger shadow-[0_0_8px_#ef4444]' : styles.accent.split('-')[1] === 'warning' ? 'bg-warning shadow-[0_0_8px_#f59e0b]' : 'bg-primary shadow-[0_0_8px_#3b82f6]'}`}
                    />
                 </div>
              </div>

              {/* HUD Close Interface */}
              <button 
                onClick={onClose}
                className="p-2.5 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/10 transition-all group/close shadow-inner active:scale-95"
                title="Disconnect Neural Link"
              >
                <X size={20} className="text-white/40 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-0 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 relative bg-[#05080f]/50">
          
          {/* Subtle Grid Pattern Mask */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative z-10 w-full h-full min-h-0">
            
            {/* Left Column: Narrative & Timeline */}
            <div className="lg:col-span-12 p-8 lg:p-10 space-y-12 pl-12 lg:pl-14">
              
              {/* Executive Summary */}
              <section className="relative">
                 <div className="flex items-center gap-3 mb-6">
                    <Terminal size={18} className="text-primary animate-pulse" />
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] m-0">Narrative Intelligence Summary</h3>
                 </div>
                 <div className="relative group">
                    <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-primary/30" />
                    <div className="p-6 bg-white/[0.02] rounded-xl border border-white/5 min-h-[100px] flex flex-col justify-center relative overflow-hidden group-hover:border-white/10 transition-colors">
                       <Radio size={100} className="absolute -right-10 -bottom-10 text-white/[0.02]" />
                       {loading ? (
                          <div className="space-y-4 opacity-50">
                             <div className="h-2 w-full bg-white/20 rounded animate-pulse" />
                             <div className="h-2 w-5/6 bg-white/20 rounded animate-pulse" />
                             <div className="h-2 w-4/5 bg-white/20 rounded animate-pulse" />
                          </div>
                       ) : (
                          <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-base text-white/70 leading-relaxed m-0 italic font-medium relative z-10"
                          >
                             <span className="text-3xl text-white/20 absolute -left-2 -top-2 leading-none">“</span>
                             {brief?.narrative_explanation || "No deep-dive narrative available for this sector."}
                             <span className="text-3xl text-white/20 absolute leading-none ml-1">”</span>
                          </motion.p>
                       )}
                    </div>
                 </div>
              </section>

              {/* Impact Timeline & Affected Industries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                
                {/* Timeline */}
                <section>
                   <div className="flex items-center gap-3 mb-6">
                      <Clock size={16} className="text-warning" />
                      <h3 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em] m-0">Propagation Timeline</h3>
                   </div>
                   <div className="space-y-4 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-[2px] before:bg-white/5">
                      {loading ? (
                         [...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-white/[0.02] rounded-xl animate-pulse ml-16" />
                         ))
                      ) : (
                         <>
                            <div className="flex gap-6 relative group">
                               <div className="w-16 shrink-0 flex flex-col items-center justify-center relative z-10 pt-2">
                                  <div className="w-4 h-4 bg-background border-2 border-warning rounded-full mb-2 shadow-[0_0_10px_rgba(245,158,11,0.5)] group-hover:scale-125 transition-transform" />
                                  <span className="text-[9px] mono text-white/40 uppercase font-black tracking-widest text-center">0-3d<br/>Immdt</span>
                               </div>
                               <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl flex-1 group-hover:bg-white/[0.04] transition-colors relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning/50 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <p className="text-xs text-white/60 m-0 leading-relaxed">{brief?.time_based_impact?.immediate}</p>
                               </div>
                            </div>
                            <div className="flex gap-6 relative group">
                               <div className="w-16 shrink-0 flex flex-col items-center justify-center relative z-10 pt-2">
                                  <div className="w-4 h-4 bg-background border-2 border-primary rounded-full mb-2 shadow-[0_0_10px_rgba(59,130,246,0.5)] group-hover:scale-125 transition-transform" />
                                  <span className="text-[9px] mono text-white/40 uppercase font-black tracking-widest text-center">3-7d<br/>Short</span>
                               </div>
                               <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl flex-1 group-hover:bg-white/[0.04] transition-colors relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <p className="text-xs text-white/60 m-0 leading-relaxed">{brief?.time_based_impact?.short_term}</p>
                               </div>
                            </div>
                            <div className="flex gap-6 relative group">
                               <div className="w-16 shrink-0 flex flex-col items-center justify-center relative z-10 pt-2">
                                  <div className="w-4 h-4 bg-background border-2 border-slate-500 rounded-full mb-2 group-hover:scale-125 transition-transform" />
                                  <span className="text-[9px] mono text-white/40 uppercase font-black tracking-widest text-center">7-14d<br/>Med</span>
                               </div>
                               <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl flex-1 group-hover:bg-white/[0.04] transition-colors relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-500/50 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <p className="text-xs text-white/60 m-0 leading-relaxed">{brief?.time_based_impact?.medium_term}</p>
                               </div>
                            </div>
                         </>
                      )}
                   </div>
                </section>

                {/* Vertical Exposure */}
                <section>
                   <div className="flex items-center gap-3 mb-6">
                      <Layers size={16} className="text-danger" />
                      <h3 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em] m-0">Predicted Vertical Exposure</h3>
                   </div>
                   <div className="glass-panel rounded-xl border border-white/5 p-6 min-h-[140px] flex flex-col h-full hover:border-white/10 transition-colors">
                      {loading ? (
                         <div className="grid grid-cols-2 gap-3 opacity-30">
                            {[...Array(4)].map((_, i) => (
                               <div key={i} className="h-8 bg-white/20 rounded-md animate-pulse" />
                            ))}
                         </div>
                      ) : (
                         <>
                            <div className="flex flex-wrap gap-2 mb-8">
                               {brief?.impact_analysis?.affected_industries?.map((ind, i) => (
                                  <span key={i} className="text-[10px] font-black bg-white/[0.05] text-white/80 border border-white/10 px-4 py-2 rounded-lg uppercase tracking-tight shadow-sm hover:bg-white/10 transition-colors cursor-default">
                                     {ind}
                                  </span>
                               ))}
                            </div>
                            <div className="w-full mt-auto pt-6 border-t border-white/10">
                               <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-lg border border-white/5">
                                  <span className="text-[10px] mono text-white/40 uppercase font-black tracking-widest">Estimated Delay Impact</span>
                                  <span className="text-sm text-white font-black uppercase tracking-tighter">{brief?.impact_analysis?.estimated_delay_timeline}</span>
                               </div>
                            </div>
                         </>
                      )}
                   </div>
                </section>
              </div>

              {/* Action Recommendations Matrix */}
              <section className="pb-12">
                 <div className="flex items-center gap-3 mb-6">
                    <Shield size={16} className="text-success" />
                    <h3 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em] m-0">Operational Mitigation Matrix</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loading ? (
                       [...Array(2)].map((_, i) => (
                          <div key={i} className="h-40 bg-white/[0.02] rounded-xl animate-pulse" />
                       ))
                    ) : (
                       brief?.action_recommendations?.map((action, i) => (
                          <div key={i} className="glass-panel border-l-2 border-l-success border-white/5 rounded-xl p-6 group flex flex-col h-full hover:bg-white/[0.04] transition-all hover:-translate-y-1 hover:shadow-2xl">
                             <div className="flex items-start gap-4 mb-4">
                                <div className="h-8 w-8 flex items-center justify-center bg-success/10 rounded-lg shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                   <Zap size={14} className="text-success" />
                                </div>
                                <h4 className="text-xs font-black text-white uppercase tracking-tight mt-1 group-hover:text-success transition-colors">
                                   {action.strategy}
                                </h4>
                             </div>
                             <p className="text-xs text-white/60 leading-relaxed m-0 italic group-hover:text-white/80 transition-colors flex-1 bg-black/20 p-4 rounded-lg border border-white/5">
                                "{action.operational_suggestion}"
                             </p>
                          </div>
                       ))
                    )}
                 </div>
              </section>

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/[0.02] border-t border-white/10 flex flex-col md:flex-row justify-between items-center shrink-0 z-10 gap-4">
          <div className="flex gap-6">
            <button className="flex items-center gap-2 text-[10px] mono font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest group">
              <Activity size={14} className="group-hover:text-primary transition-colors" /> Live Propagation
            </button>
            <button className="flex items-center gap-2 text-[10px] mono font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest group">
              <TrendingUp size={14} className="group-hover:text-primary transition-colors" /> Dependency Graph
            </button>
          </div>
          <button 
            onClick={onClose}
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-8 py-3.5 rounded-lg bg-white text-[#05080f] hover:bg-primary hover:text-white transition-all active:scale-95 shadow-xl"
          >
            Acknowledge Matrix <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default PredictionDetailView;
