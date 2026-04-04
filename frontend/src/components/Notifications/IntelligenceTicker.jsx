import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, AlertTriangle, Shield, MapPin, TrendingUp } from 'lucide-react';
import * as api from '../../services/api';

const IntelligenceTicker = () => {
  const [headlines, setHeadlines] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHeadlines = async () => {
      try {
        const [events, predictions] = await Promise.all([
          api.fetchEvents(),
          api.fetchPredictions()
        ]);

        // Format Detected Events
        const eventHeadlines = events.slice(0, 5).map(event => ({
          id: event.id,
          text: `[SIGNAL] ${event.event_type.replace(/_/g, ' ')} detected in ${event.location}`,
          severity: event.severity,
          type: event.event_type,
          industry: event.industry,
          country: event.country,
          source: 'detected'
        }));

        // Format Top Predictions
        const predictionHeadlines = predictions
          .filter(p => p.probability > 0.6)
          .sort((a, b) => b.probability - a.probability)
          .slice(0, 3)
          .map(prediction => ({
            id: `pred-${prediction.id || prediction.event_type}`,
            text: `[FORECAST] ${(prediction.probability * 100).toFixed(0)}% Probability: ${prediction.event_type.replace(/_/g, ' ')} near ${prediction.location}`,
            severity: prediction.probability > 0.8 ? 'critical' : prediction.probability > 0.7 ? 'high' : 'medium',
            type: prediction.event_type,
            industry: prediction.industry || 'Multi-Sector',
            country: prediction.location.split(',').pop().trim(),
            source: 'prediction'
          }));

        const combined = [...eventHeadlines, ...predictionHeadlines];
        
        if (combined.length === 0) {
          combined.push({ 
            id: 'default', 
            text: 'Neural networks operational. Monitoring global supply chain signals...', 
            severity: 'low',
            type: 'system',
            source: 'system'
          });
        }
        
        setHeadlines(combined);
      } catch (err) {
        console.error('Failed to load ticker headlines:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHeadlines();
    const refreshInterval = setInterval(loadHeadlines, 5 * 60 * 1000); // 5 min refresh
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (headlines.length <= 1) return;
    
    const cycleInterval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % headlines.length);
    }, 6000); // 6s cycle
    
    return () => clearInterval(cycleInterval);
  }, [headlines]);

  if (loading && headlines.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-full min-w-[300px]">
        <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
        <div className="h-2 w-32 bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  const current = headlines[currentIndex] || headlines[0];
  const Icon = current?.severity === 'critical' || current?.severity === 'high' 
    ? AlertTriangle 
    : current?.type?.includes('weather') || current?.type?.includes('storm')
    ? Zap
    : current?.type === 'system'
    ? Shield
    : Activity;

  const severityColor = current?.severity === 'critical' || current?.severity === 'high'
    ? 'text-danger'
    : current?.severity === 'medium'
    ? 'text-warning'
    : 'text-success';

  const severityBg = current?.severity === 'critical' || current?.severity === 'high'
    ? 'bg-danger/10 border-danger/20'
    : current?.severity === 'medium'
    ? 'bg-warning/10 border-warning/20'
    : 'bg-success/10 border-success/20';

  return (
    <div className="hidden md:flex items-center gap-6 px-8 py-2.5 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-3xl shadow-inner overflow-hidden w-full max-w-5xl relative h-12 group cursor-default">
      {/* Dynamic Background Glow */}
      <div className={`absolute inset-0 opacity-20 transition-all duration-1000 ${
        current?.severity === 'critical' ? 'bg-danger/20' : 
        current?.severity === 'high' ? 'bg-danger/10' : 
        current?.severity === 'medium' ? 'bg-warning/10' : 
        'bg-primary/10'
      }`} />
      
      {/* Neural Heartbeat Animation */}
      <div className="flex items-center gap-3 shrink-0 relative z-10">
        <div className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 rounded-full blur-[4px] ${severityColor.replace('text-', 'bg-')}`}
          />
          <Icon size={16} className={`${severityColor} relative z-10`} />
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black mono uppercase tracking-[0.2em] text-white/40 italic leading-none mb-1">Signal Core</span>
          <div className="flex items-center gap-1.5 leading-none">
             <div className={`w-1 h-1 rounded-full ${severityColor.replace('text-', 'bg-')} animate-pulse`} />
             <span className="text-[10px] font-bold mono text-white/20 whitespace-nowrap uppercase tracking-tighter italic">Lvl-{current?.severity || '??'}</span>
          </div>
        </div>
      </div>
      
      <div className="w-[1px] h-6 bg-white/10 mx-2" />
      
      <div className="relative flex-1 h-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center gap-3"
          >
            <span className="text-[14px] font-black text-white italic mono uppercase tracking-tight truncate max-w-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              {current?.text}
            </span>
            
            {current?.industry && (
              <span className="text-[10px] px-2 py-0.5 rounded border border-white/5 bg-white/5 text-white/30 mono uppercase font-bold tracking-widest shrink-0">
                {current.industry}
              </span>
            )}
            
            {current?.country && (
              <div className="flex items-center gap-1.5 opacity-40 shrink-0">
                <MapPin size={10} className="text-primary" />
                <span className="text-[10px] font-bold text-white mono uppercase tracking-tighter">{current.country}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 shrink-0 relative z-10 pl-6 border-l border-white/10">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
             <TrendingUp size={12} className="text-success animate-bounce" />
             <span className="text-[10px] mono font-black text-white uppercase tracking-[0.3em]">LIVE</span>
          </div>
          <span className="text-[8px] mono text-white/20 font-bold uppercase tracking-widest leading-none">Inbound Feed-0(3)</span>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceTicker;
