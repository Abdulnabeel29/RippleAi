import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertOctagon, Zap, Shield, ChevronRight, Activity, Cpu, MapPin, Radio, Timer } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../../services/api';
import PredictionDetailView from './PredictionDetailView';

const PredictionsPanel = ({ predictions }) => {
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const sortedPredictions = React.useMemo(() => {
    if (!Array.isArray(predictions)) return [];
    return [...predictions].sort((a, b) => (b.probability || 0) - (a.probability || 0));
  }, [predictions]);

  const totalPages = Math.ceil(sortedPredictions.length / itemsPerPage);
  const paginatedPredictions = sortedPredictions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!predictions) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-64 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col w-full px-6 lg:px-10 py-8">
      {/* HUD Header Component */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between mb-12 gap-8 border-l-2 border-primary/20 pl-8 relative">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <Cpu size={24} className="text-primary" />
             </div>
             <div className="flex flex-col">
                <h3 className="text-3xl font-black text-white tracking-tighter m-0 uppercase italic">
                  Neural Intelligence Engine
                </h3>
                <div className="flex items-center gap-2">
                   <span className="mono text-[9px] font-black tracking-extreme text-primary/60 uppercase">Strategic Forecast Matrix :: ACTIVE</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_#10b981]" />
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-10">
           <div className="flex flex-col items-end">
              <span className="mono text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-1">Model Precision</span>
              <div className="flex items-center gap-2">
                 <span className="text-xl font-black text-white tracking-tighter italic">98.4% CONF</span>
                 <TrendingUp size={16} className="text-success" />
              </div>
           </div>
           
           <div className="w-px h-10 bg-white/10 hidden lg:block" />

           <button className="group flex items-center gap-3 px-6 py-3 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white hover:text-[#05080f] transition-all duration-500 shadow-xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Radio size={16} className="group-hover:animate-pulse relative z-10" />
              <span className="mono text-[10px] font-black uppercase tracking-widest relative z-10">Sync Neural Weights</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedPredictions.map((pred, idx) => {
          const key = `${pred.event_type}-${pred.location}`;
          const isHigh = pred.risk_level.toLowerCase() === 'high' || pred.risk_level.toLowerCase() === 'critical';
          const isMed = pred.risk_level.toLowerCase() === 'medium';
          
          const styles = {
            accent: isHigh ? 'text-danger' : isMed ? 'text-warning' : 'text-primary',
            pipe: isHigh ? 'status-pipe-red' : isMed ? 'status-pipe-amber' : 'status-pipe-blue',
            label: isHigh ? 'bg-danger/10 text-danger border-danger/20' : isMed ? 'bg-warning/10 text-warning border-warning/20' : 'bg-primary/10 text-primary border-primary/20',
          };

          const isSynthesized = pred.is_synthesized || (pred.why && !pred.why.includes('Analyzing') && !pred.why.includes('pending'));

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative group h-full cursor-pointer hover:z-10"
              onClick={() => setSelectedPrediction(pred)}
            >
              {/* Premium Intelligence Card Container */}
              <div className="glass-panel p-7 rounded-2xl flex flex-col h-full border border-white/5 group-hover:border-white/10 transition-all duration-500 relative overflow-hidden group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
                
                {/* Status Pipe Indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${styles.pipe}`} />

                {/* Animated Inner Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[80px] rounded-full group-hover:bg-white/10 transition-colors duration-700" />

                {/* Header Information */}
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`px-2 py-0.5 rounded text-[8px] font-black mono tracking-[0.2em] uppercase border ${styles.label}`}>
                          {pred.risk_level}
                       </span>
                       <span className="text-[10px] mono text-white/20 font-bold uppercase tracking-tighter">ID::{idx.toString().padStart(3, '0')}</span>
                    </div>
                    <h4 className="text-xl font-black text-white uppercase tracking-tight m-0 italic group-hover:text-primary transition-colors">
                      {pred.event_type.replace(/_/g, ' ')}
                    </h4>
                    <div className="flex items-center gap-2 mt-2 text-white/40">
                      <MapPin size={12} className={styles.accent} />
                      <span className="text-[11px] font-bold tracking-tight uppercase">{pred.location}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="mono text-2xl font-black text-white italic tracking-tighter leading-none group-hover:scale-110 transition-transform duration-500">
                      {(pred.probability * 100).toFixed(0)}%
                    </div>
                    <span className="mono text-[8px] text-white/30 uppercase tracking-widest font-black">Confidence</span>
                  </div>
                </div>

                {/* Intelligence Analysis Matrix */}
                <div className="flex-1 flex flex-col gap-6 relative z-10">
                  
                  {/* Narrative Block (WHY) */}
                  <div className="relative pl-4">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10" />
                    <div className="flex items-center gap-2 mb-2">
                       <Shield size={10} className="text-primary/60" />
                       <span className="mono text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">Risk Vector</span>
                    </div>
                    {isSynthesized ? (
                      <p className="text-xs text-white/70 font-medium leading-relaxed m-0 italic drop-shadow-md">
                        <span className="text-white/20 text-xl leading-none absolute -left-1 -top-1">“</span>
                        {pred.why}
                        <span className="text-white/20 text-xl leading-none absolute -bottom-1">”</span>
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5 opacity-20">
                         <div className="h-1 w-full bg-white/50 rounded animate-pulse" />
                         <div className="h-1 w-2/3 bg-white/50 rounded animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Impact Block (HOW) */}
                  <div className="relative pl-4">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10" />
                    <div className="flex items-center gap-2 mb-2">
                       <Activity size={10} className="text-primary/60" />
                       <span className="mono text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">Operational Impact</span>
                    </div>
                    {isSynthesized ? (
                      <p className="text-xs text-white/70 font-medium leading-relaxed m-0 italic">
                        <span className="text-white/20 text-xl leading-none absolute -left-1 -top-1">“</span>
                        {pred.how}
                        <span className="text-white/20 text-xl leading-none absolute -bottom-1">”</span>
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5 opacity-20">
                         <div className="h-1 w-full bg-white/50 rounded animate-pulse" />
                         <div className="h-1 w-3/4 bg-white/50 rounded animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Futuristic Information Footer */}
                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
                   <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Timer size={10} className="text-primary/60" />
                          <span className="mono text-[8px] text-white/30 uppercase tracking-widest font-black">Est Prop Delay</span>
                        </div>
                        <span className="text-sm font-black text-white tracking-tighter">+{pred.expected_delay_days} Business Days</span>
                      </div>
                   </div>

                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       setSelectedPrediction(pred);
                     }}
                     className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg text-[10px] font-black text-white uppercase tracking-widest hover:bg-primary transition-all duration-300 border border-white/5 shadow-lg group/btn"
                   >
                     Strategic Brief <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                   </button>
                </div>

                {/* Subtle Grid Pattern Mask */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Elite Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-12 bg-white/[0.02] border border-white/5 rounded-xl px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <span className="mono text-[10px] text-white/40 uppercase tracking-widest font-black">
               Page {currentPage} of {totalPages}
             </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg mono text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary active:scale-95'}`}
            >
               Prev
            </button>
            <div className="flex gap-1.5 px-4 hidden sm:flex">
               {[...Array(totalPages)].map((_, i) => (
                 <button
                   key={i}
                   onClick={() => setCurrentPage(i + 1)}
                   className={`w-2 h-2 rounded-full transition-all duration-300 ${currentPage === i + 1 ? 'bg-primary shadow-[0_0_8px_#3b82f6] w-6' : 'bg-white/20 hover:bg-white/40'}`}
                 />
               ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg mono text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary active:scale-95'}`}
            >
               Next
            </button>
          </div>
        </div>
      )}

      <PredictionDetailView 
        prediction={selectedPrediction} 
        onClose={() => setSelectedPrediction(null)} 
      />
    </div>
  );
};

export default PredictionsPanel;
;
