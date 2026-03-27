import React from 'react';
import { AlertOctagon, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const TopInsightBanner = ({ predictions }) => {
  if (!predictions || predictions.length === 0) return null;

  const highRiskPreds = predictions.filter(p => p.risk_level.toLowerCase() === 'high');
  const topInsight = highRiskPreds.length > 0 ? highRiskPreds[0] : predictions[0];
  const riskClass = topInsight.risk_level.toLowerCase();

  const getRiskStyles = (level) => {
    switch (level) {
      case 'high': return {
        bg: 'bg-gradient-to-r from-danger/10 to-transparent border-b-danger/30',
        pulse: 'bg-danger shadow-[0_0_12px_var(--danger-color)]',
        label: 'bg-danger/15 text-danger',
        badge: 'bg-danger/10 border-danger/30 text-danger'
      };
      case 'medium': return {
        bg: 'bg-gradient-to-r from-warning/10 to-transparent border-b-warning/30',
        pulse: 'bg-warning shadow-[0_0_12px_var(--warning-color)]',
        label: 'bg-warning/15 text-warning',
        badge: 'bg-warning/10 border-warning/30 text-warning'
      };
      default: return {
        bg: 'bg-gradient-to-r from-low/10 to-transparent border-b-border',
        pulse: 'hidden',
        label: 'bg-white/10 text-primary-foreground',
        badge: 'bg-low/10 border-low/30 text-low'
      };
    }
  };

  const styles = getRiskStyles(riskClass);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
      className={`relative z-20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-8 py-4 border-b border-white/5 bg-background text-sm transition-shadow ${styles.bg}`}
    >
      {/* Pulse Indicator */}
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`absolute left-0 top-0 bottom-0 w-1 ${styles.pulse}`}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-5 flex-1 ml-0 lg:ml-2">
        <span className={`shrink-0 px-2.5 py-1 rounded text-xs font-bold tracking-widest ${styles.label}`}>
          SYSTEM ALERT
        </span>

        <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm md:text-base leading-relaxed">
          <strong className="text-primary-foreground font-bold tracking-tight">{topInsight.event_type}</strong>
          <span>detected in</span>
          <strong className="text-primary-foreground flex items-center font-bold tracking-tight">
            <MapPin size={14} className="inline mr-1 text-primary" /> {topInsight.location}
          </strong>
          <span className="text-white/20 mx-1 hidden md:inline">•</span>
          <span className="text-primary-foreground font-semibold">Probability: {(topInsight.probability * 100).toFixed(0)}%</span>
          <span className="text-border mx-1 hidden md:inline">•</span>
          <span className="flex-1 min-w-full md:min-w-0 mt-1 md:mt-0 italic">{topInsight.explanation}</span>
        </div>
      </div>

      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${styles.badge}`}>
        <AlertOctagon size={16} /> {topInsight.risk_level} Risk
      </div>
    </motion.div>
  );
};

export default TopInsightBanner;
