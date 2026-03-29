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
  ArrowRight
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

  const riskColor = prediction.risk_level.toLowerCase() === 'high' ? 'text-danger' :
    prediction.risk_level.toLowerCase() === 'medium' ? 'text-warning' : 'text-low';
  
  const riskBg = prediction.risk_level.toLowerCase() === 'high' ? 'bg-danger/20' :
    prediction.risk_level.toLowerCase() === 'medium' ? 'bg-warning/20' : 'bg-low/20';

  return (
    <Dialog open={!!prediction} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] rounded-xl bg-[#0a0f14] border-white/10 text-white p-0 overflow-hidden shadow-2xl ring-1 ring-white/5 flex flex-col">
        
        {/* Header Section */}
        <div className="relative border-b border-white/5 bg-[#0d1218] p-8 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse`} />
                <span className="text-[11px] mono font-bold text-emerald-500 uppercase tracking-widest">Strategic Brief Online</span>
              </div>
              <DialogTitle className="text-4xl font-bold tracking-tighter text-white mb-2 uppercase italic italic-none">
                {prediction.event_type.replace(/_/g, ' ')} Forecast
              </DialogTitle>
              <DialogDescription className="sr-only">
                Deep-dive situational intelligence for the predicted {prediction.event_type} in {prediction.location}.
              </DialogDescription>
              <div className="flex items-center gap-3 text-slate-400">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-sm border border-white/5">
                   <Zap size={12} className="text-primary" />
                   <span className="text-[10px] mono font-bold uppercase tracking-widest">{prediction.location}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 ${riskBg} rounded-sm border border-white/5`}>
                   <AlertTriangle size={12} className={riskColor} />
                   <span className={`text-[10px] mono font-bold uppercase tracking-widest ${riskColor}`}>{prediction.risk_level} Impact Potential</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 mono uppercase tracking-widest">Neural Projection Confidence</span>
                  <span className="text-2xl font-bold text-white tracking-tighter">{(prediction.probability * 100).toFixed(1)}%</span>
               </div>
               <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${prediction.probability * 100}%` }}
                    transition={{ duration: 1.5, ease: 'circOut' }}
                    className="h-full bg-primary shadow-[0_0_8px_var(--primary-color)]"
                  />
               </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Left Column: Narrative & Timeline */}
            <div className="lg:col-span-12 p-8 space-y-10 border-r border-white/5 bg-gradient-to-b from-transparent to-[#0d1218]/40">
              
              {/* Executive Summary */}
              <section>
                 <div className="flex items-center gap-2 mb-4">
                    <Terminal size={16} className="text-secondary" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] m-0">Narrative Intelligence Summary</h3>
                 </div>
                 <div className="relative group">
                    <div className="absolute -left-2 top-0 bottom-0 w-1 bg-secondary opacity-20" />
                    <div className="p-5 bg-white/5 rounded-sm border border-white/5 min-h-[100px] flex flex-col justify-center">
                       {loading ? (
                          <div className="space-y-3">
                             <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                             <div className="h-3 w-5/6 bg-white/5 rounded animate-pulse" />
                             <div className="h-3 w-4/5 bg-white/5 rounded animate-pulse" />
                          </div>
                       ) : (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-slate-300 leading-relaxed m-0 italic font-medium"
                          >
                             "{brief?.narrative_explanation || "No deep-dive narrative available for this sector."}"
                          </motion.p>
                       )}
                    </div>
                 </div>
              </section>

              {/* Impact Timeline & Affected Industries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Timeline */}
                <section>
                   <div className="flex items-center gap-2 mb-4">
                      <Clock size={16} className="text-primary" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] m-0">Propagation Timeline</h3>
                   </div>
                   <div className="space-y-3">
                      {loading ? (
                         [...Array(3)].map((_, i) => (
                            <div key={i} className="h-14 bg-white/5 rounded animate-pulse" />
                         ))
                      ) : (
                         <>
                            <div className="p-3 bg-white/5 border border-white/5 rounded-sm flex gap-4 transition-all hover:bg-white/10 group">
                               <div className="w-16 shrink-0 flex flex-col items-center justify-center border-r border-white/5 px-2">
                                  <span className="text-[9px] mono text-slate-500 uppercase">Immediate</span>
                                  <span className="text-[10px] font-bold text-white">0-3d</span>
                               </div>
                               <p className="text-[11px] text-slate-400 m-0 group-hover:text-slate-200">{brief?.time_based_impact?.immediate}</p>
                            </div>
                            <div className="p-3 bg-white/5 border border-white/5 rounded-sm flex gap-4 transition-all hover:bg-white/10 group">
                               <div className="w-16 shrink-0 flex flex-col items-center justify-center border-r border-white/5 px-2">
                                  <span className="text-[9px] mono text-slate-500 uppercase">Short Term</span>
                                  <span className="text-[10px] font-bold text-white">3-7d</span>
                               </div>
                               <p className="text-[11px] text-slate-400 m-0 group-hover:text-slate-200">{brief?.time_based_impact?.short_term}</p>
                            </div>
                            <div className="p-3 bg-white/5 border border-white/5 rounded-sm flex gap-4 transition-all hover:bg-white/10 group">
                               <div className="w-16 shrink-0 flex flex-col items-center justify-center border-r border-white/5 px-2">
                                  <span className="text-[9px] mono text-slate-500 uppercase">Medium Term</span>
                                  <span className="text-[10px] font-bold text-white">7-14d</span>
                               </div>
                               <p className="text-[11px] text-slate-400 m-0 group-hover:text-slate-200">{brief?.time_based_impact?.medium_term}</p>
                            </div>
                         </>
                      )}
                   </div>
                </section>

                {/* Vertical Exposure */}
                <section>
                   <div className="flex items-center gap-2 mb-4">
                      <Layers size={16} className="text-warning" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] m-0">Predicted Vertical Exposure</h3>
                   </div>
                   <div className="bg-black/30 rounded-sm border border-white/5 p-5 min-h-[140px]">
                      {loading ? (
                         <div className="grid grid-cols-2 gap-2">
                            {[...Array(4)].map((_, i) => (
                               <div key={i} className="h-6 bg-white/5 rounded animate-pulse" />
                            ))}
                         </div>
                      ) : (
                         <div className="flex flex-wrap gap-2">
                            {brief?.impact_analysis?.affected_industries?.map((ind, i) => (
                               <span key={i} className="text-[10px] font-medium bg-[#1a212c] text-slate-300 border border-white/5 px-3 py-1.5 rounded-sm">
                                  {ind.toUpperCase()}
                               </span>
                            ))}
                            <div className="w-full mt-4 pt-4 border-t border-white/5">
                               <div className="flex justify-between items-center text-[10px] mono text-slate-500">
                                  <span>Estimated Delay Impact</span>
                                  <span className="text-white font-bold">{brief?.impact_analysis?.estimated_delay_timeline}</span>
                               </div>
                            </div>
                         </div>
                      )}
                   </div>
                </section>
              </div>

              {/* Action Recommendations Matrix */}
              <section className="pb-8">
                 <div className="flex items-center gap-2 mb-6">
                    <Shield size={16} className="text-success" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] m-0">Operational Mitigation Matrix</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loading ? (
                       [...Array(2)].map((_, i) => (
                          <div key={i} className="h-32 bg-white/5 rounded animate-pulse" />
                       ))
                    ) : (
                       brief?.action_recommendations?.map((action, i) => (
                          <div key={i} className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-all border border-emerald-500/10 rounded-sm p-5 group flex flex-col h-full hover:border-emerald-500/20">
                             <div className="flex items-start gap-3 mb-3">
                                <div className="h-6 w-6 mt-0.5 flex items-center justify-center bg-emerald-500/20 rounded-full shrink-0 group-hover:scale-110 transition-transform">
                                   <Zap size={10} className="text-emerald-400" anchor="zap"/>
                                </div>
                                <h4 className="text-[12px] font-bold text-emerald-400 uppercase tracking-widest mt-1">
                                   {action.strategy}
                                </h4>
                             </div>
                             <p className="text-[11px] text-slate-400 leading-relaxed m-0 italic group-hover:text-slate-300 transition-colors flex-1">
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
        <div className="p-4 bg-[#0d1218] border-t border-white/5 flex justify-between items-center shrink-0">
          <div className="flex gap-4">
            <button className="flex items-center gap-2 text-[10px] mono font-bold text-slate-500 hover:text-white transition-colors">
              <Activity size={12} /> Live Propagation View
            </button>
            <button className="flex items-center gap-2 text-[10px] mono font-bold text-slate-500 hover:text-white transition-colors">
              <TrendingUp size={12} /> Dependency Graph
            </button>
          </div>
          <button 
            onClick={onClose}
            className="text-[10px] font-bold uppercase tracking-widest px-8 py-2 rounded-sm bg-primary hover:bg-primary/90 text-black transition-all active:scale-95"
          >
            Acknowledge Intelligence
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default PredictionDetailView;
