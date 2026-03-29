import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertOctagon, Zap, Shield, ChevronRight, Activity, Cpu, MapPin } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../../services/api';
import PredictionDetailView from './PredictionDetailView';

const PredictionsPanel = ({ predictions }) => {
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  // Memoize sorted predictions to ensure stable top-down priority
  const sortedPredictions = React.useMemo(() => {
    if (!Array.isArray(predictions)) return [];
    return [...predictions].sort((a, b) => (b.probability || 0) - (a.probability || 0));
  }, [predictions]);

  if (!predictions) return (
    <Card className="flex flex-col gap-4 p-4 min-h-[300px] border-border bg-card shadow-lg bg-opacity-60 flex-1">
      <div className="h-6 w-2/5 rounded bg-muted/20 animate-pulse" />
      <div className="flex-1 rounded-lg bg-muted/10 animate-pulse" />
    </Card>
  );

  return (
    <div className="flex flex-col w-full px-2">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
             <h3 className="text-2xl font-bold text-white tracking-tighter m-0 flex items-center gap-2">
               <Cpu size={20} className="text-secondary" />
               AI Predictions Engine
             </h3>
             <span className="bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest mt-1">
               Strategic Forecast Mode
             </span>
          </div>
          <p className="text-[11px] text-slate-500 mono uppercase tracking-tight m-0">
            Real-time statistical extrapolation of global supply chain volatility
          </p>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 mono uppercase tracking-widest">Confidence Threshold</span>
              <span className="text-xs font-bold text-white">GEN-4 MODEL: 92.4%</span>
           </div>
           <button className="h-10 w-10 flex items-center justify-center rounded-sm bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all group">
             <span className="material-symbols-outlined text-sm group-hover:rotate-90 transition-transform">settings_suggest</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedPredictions.map((pred, idx) => {
          const key = `${pred.event_type}-${pred.location}`;
          const riskColor = pred.risk_level.toLowerCase() === 'high' ? 'text-danger' :
            pred.risk_level.toLowerCase() === 'medium' ? 'text-warning' : 'text-low';
          const riskBg = pred.risk_level.toLowerCase() === 'high' ? 'bg-danger shadow-[0_0_8px_var(--danger-color)]' :
            pred.risk_level.toLowerCase() === 'medium' ? 'bg-warning shadow-[0_0_8px_var(--warning-color)]' : 'bg-low';

          // Data is synthesized if why/how are present and not the default loading strings
          const isSynthesized = pred.is_synthesized || (pred.why && !pred.why.includes('Analyzing') && !pred.why.includes('pending'));

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="relative group h-full cursor-pointer"
              onClick={() => setSelectedPrediction(pred)}
            >
              {/* Card Container */}
              <div className="bg-[#0f151c] p-6 rounded-sm border border-white/5 group-hover:border-white/20 transition-all flex flex-col h-full shadow-2xl relative overflow-hidden">
                
                {/* Background Decor */}
                <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                   <Target size={120} />
                </div>

                {/* Header Phase: Statistical Fact */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                       <Zap size={14} className={riskColor} />
                       <h4 className="text-base font-bold text-white uppercase tracking-tight m-0">{pred.event_type.replace(/_/g, ' ')}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] mono uppercase tracking-widest">
                      <MapPin size={10} className="text-primary" />
                      {pred.location.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-sm bg-black/40 border mono font-bold ${riskColor} border-current/30`}>
                      {(pred.probability * 100).toFixed(0)}% PROB
                    </span>
                    <span className="text-[9px] text-slate-500 mono uppercase tracking-tighter">
                       Tier 1 Factor Analysis
                    </span>
                  </div>
                </div>

                {/* Progress Bar: Risk Density */}
                <div className="mb-6 relative z-10">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[9px] mono text-slate-500 uppercase tracking-widest">Volatility Index</span>
                        <span className={`text-[10px] font-bold ${riskColor} uppercase`}>{pred.risk_level} Impact</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pred.probability * 100}%` }}
                        transition={{ duration: 1.2, ease: 'circOut' }}
                        className={`h-full rounded-full ${riskBg.split(' ')[0]}`}
                      />
                    </div>
                </div>

                {/* Deep Intelligence Phase: Narrative Synthesis */}
                <div className="flex-1 space-y-5 relative z-10">
                  
                  {/* Risk Vector (WHY) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                           <Shield size={12} className="text-secondary" />
                           <span className="text-[10px] font-bold text-white uppercase tracking-widest">Risk Vector (WHY)</span>
                        </div>
                        {isSynthesized ? (
                           <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded-sm mono font-bold ring-1 ring-emerald-500/20">Synthesized</span>
                        ) : (
                           <span className="text-[8px] bg-white/5 text-slate-500 px-1 py-0.5 rounded-sm mono font-bold">Predicting…</span>
                        )}
                    </div>
                    <div className="p-3 bg-black/30 rounded-sm border border-white/5 min-h-[44px]">
                       {isSynthesized ? (
                          <p className="text-[11px] text-slate-300 leading-relaxed m-0 italic">
                             "{pred.why}"
                          </p>
                       ) : (
                          <div className="space-y-1.5">
                             <div className="h-1 w-full bg-white/5 rounded animate-pulse" />
                             <div className="h-1 w-2/3 bg-white/5 rounded animate-pulse" />
                          </div>
                       )}
                    </div>
                  </div>

                  {/* Operational Impact (HOW) */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Activity size={12} className="text-primary" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Operational Impact (HOW)</span>
                    </div>
                    <div className="p-3 bg-black/30 rounded-sm border border-white/5 min-h-[44px]">
                       {isSynthesized ? (
                          <p className="text-[11px] text-slate-300 leading-relaxed m-0 italic">
                             "{pred.how}"
                          </p>
                       ) : (
                          <div className="space-y-1.5">
                             <div className="h-1 w-full bg-white/5 rounded animate-pulse" />
                             <div className="h-1 w-3/4 bg-white/5 rounded animate-pulse" />
                          </div>
                       )}
                    </div>
                  </div>

                </div>

                {/* Footer: Predictions Stats */}
                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                   <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 mono uppercase">Estimated Prop Delay</span>
                      <span className="text-xs font-bold text-white">+{pred.expected_delay_days} Business Days</span>
                   </div>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       setSelectedPrediction(pred);
                     }}
                     className="flex items-center gap-1 text-[9px] font-bold text-secondary uppercase tracking-widest hover:text-white transition-colors group/btn"
                   >
                     Strategic Brief <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                   </button>
                </div>

              </div>
            </motion.div>
          );
        })}
      </div>

      <PredictionDetailView 
        prediction={selectedPrediction} 
        onClose={() => setSelectedPrediction(null)} 
      />
    </div>
  );
};

export default PredictionsPanel;
