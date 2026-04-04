import React, { useState, useEffect } from 'react';
import { AlertOctagon, MapPin, ChevronRight, ChevronLeft, Target, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TopInsightBanner = ({ predictions }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const alerts = predictions.filter(p => 
    p.risk_level.toLowerCase() === 'high' || p.risk_level.toLowerCase() === 'critical'
  );
  
  const displayAlerts = alerts.length > 0 ? alerts : predictions.slice(0, 3);

  useEffect(() => {
    if (displayAlerts.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % displayAlerts.length);
    }, 10000); // 10s for premium readability

    return () => clearInterval(timer);
  }, [displayAlerts.length, isPaused]);

  if (!displayAlerts || displayAlerts.length === 0) return null;

  const topInsight = displayAlerts[currentIndex % displayAlerts.length];
  const riskClass = topInsight.risk_level.toLowerCase();

  const getRiskStyles = (level) => {
    switch (level) {
      case 'critical':
      case 'high': return {
        glass: 'bg-danger/5 border-danger/20',
        glow: 'bg-danger shadow-[0_0_20px_#ef4444,0_0_5px_#ef4444]',
        accent: 'text-danger',
        label: 'bg-danger/10 text-danger border-danger/20',
        gradient: 'from-danger/10 via-transparent'
      };
      case 'medium': return {
        glass: 'bg-warning/5 border-warning/20',
        glow: 'bg-warning shadow-[0_0_20px_#f59e0b,0_0_5px_#f59e0b]',
        accent: 'text-warning',
        label: 'bg-warning/10 text-warning border-warning/20',
        gradient: 'from-warning/10 via-transparent'
      };
      default: return {
        glass: 'bg-primary/5 border-primary/20',
        glow: 'bg-primary shadow-[0_0_20px_#3b82f6,0_0_5px_#3b82f6]',
        accent: 'text-primary',
        label: 'bg-primary/10 text-primary border-primary/20',
        gradient: 'from-primary/10 via-transparent'
      };
    }
  };

  const styles = getRiskStyles(riskClass);

  return (
    <div 
      className="relative z-50 p-1 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Premium Outer Container with Glassmorphism */}
      <div className={`relative overflow-hidden backdrop-blur-2xl border border-white/5 bg-[#0a0f1b]/90 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 ${styles.glass}`}>
        
        {/* Animated Background Pulse Glow */}
        <div className={`absolute top-0 left-0 w-64 h-full bg-gradient-to-r ${styles.gradient} to-transparent opacity-30`} />

        <AnimatePresence mode="wait">
          <motion.div
            key={topInsight.id || currentIndex}
            initial={{ opacity: 0, scale: 0.98, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 1.02, x: -10 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col xl:flex-row items-stretch xl:items-center min-h-[90px] relative z-10"
          >
            {/* Glowing Intelligence Pipe - Vertical Indicator */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 h-12 w-[3px] rounded-full overflow-hidden">
                <motion.div 
                  animate={{ height: ["0%", "100%", "0%"], top: ["0%", "0%", "100%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-full ${styles.glow}`}
                />
            </div>

            <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-6 py-5 px-12 lg:px-14">
              
              {/* Header Group */}
              <div className="flex flex-col gap-1 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="mono font-black tracking-[0.4em] text-[9px] uppercase opacity-60 text-white flex items-center gap-2">
                     <Radio size={10} className={styles.accent} />
                     Global Signal Detected
                  </span>
                  {displayAlerts.length > 1 && (
                    <span className="text-[10px] font-mono font-bold text-white/20 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase tracking-tighter">
                      Index::{String(currentIndex + 1).padStart(2, '0')}
                    </span>
                  )}
                </div>
                <h2 className="text-xl lg:text-2xl font-black text-white leading-none tracking-tight uppercase italic drop-shadow-2xl">
                  {topInsight.event_type}
                </h2>
              </div>

              {/* Separator Pipe */}
              <div className="hidden md:block w-px h-8 bg-white/10 mx-2" />

              {/* Data Intelligence Pills */}
              <div className="flex flex-wrap items-center gap-3 flex-1 lg:gap-4">
                
                {/* Location Pill */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg group/pill hover:bg-white/10 transition-colors">
                  <MapPin size={14} className={styles.accent} />
                  <span className="text-sm font-bold text-white/90 tracking-tight uppercase">{topInsight.location}</span>
                </div>

                {/* Probability Pill */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                  <Target size={14} className="text-white/40" />
                  <div className="flex flex-col -gap-1">
                     <span className="text-[8px] font-black uppercase text-white/40 tracking-widest leading-none">Confidence</span>
                     <span className={`text-sm font-black mono ${styles.accent}`}>{(topInsight.probability * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* AI Explanation Snippet */}
                <div className="flex-1 min-w-full lg:min-w-0 flex items-start gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-lg border-dashed">
                  <p className="text-xs text-white/60 leading-relaxed font-medium line-clamp-2 italic">
                    <span className="text-white/30 text-lg leading-none mr-1">“</span>
                    {topInsight.explanation}
                    <span className="text-white/30 text-lg leading-none ml-1">”</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Action/Tier Panel */}
            <div className="flex items-center justify-between xl:justify-end gap-6 py-4 xl:py-0 px-8 xl:px-10 border-t xl:border-t-0 xl:border-l border-white/5 bg-white/[0.02]">
              
              {/* Pagination Controls - Refined */}
              {displayAlerts.length > 1 && (
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setCurrentIndex(prev => (prev - 1 + displayAlerts.length) % displayAlerts.length)}
                     className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-all text-white/40 hover:text-white"
                   >
                     <ChevronLeft size={20} />
                   </button>
                   <button 
                     onClick={() => setCurrentIndex(prev => (prev + 1) % displayAlerts.length)}
                     className="p-2 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-all text-white/40 hover:text-white"
                   >
                     <ChevronRight size={20} />
                   </button>
                </div>
              )}

              {/* Status Badge */}
              <div className={`px-4 py-2.5 rounded-lg border flex items-center gap-3 backdrop-blur-md shadow-lg transition-all duration-500 scale-100 hover:scale-105 ${styles.label}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${styles.glow}`} />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black tracking-widest uppercase opacity-60">Criticality</span>
                  <span className="text-xs font-black uppercase tracking-[0.1em]">{topInsight.risk_level} Impact</span>
                </div>
                <AlertOctagon size={18} className="ml-1 opacity-80" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Floating Scanner Bar - Modern Progress Interaction */}
        {displayAlerts.length > 1 && !isPaused && (
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/5 overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 10, ease: "linear", repeat: Infinity }}
              className={`w-full h-full opacity-50 ${styles.glow}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TopInsightBanner;
