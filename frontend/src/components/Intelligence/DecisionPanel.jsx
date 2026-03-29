import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, Clock, CheckCircle, Navigation } from 'lucide-react';
import { useDecisionIntelligence } from '../../hooks/useData';

const DecisionPanel = ({ eventId }) => {
  const { decisionData, loading } = useDecisionIntelligence(eventId);

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full bg-background/60 p-6 overflow-y-auto border-l border-primary/20 backdrop-blur-md gap-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3.5 h-3.5 rounded bg-primary/30 animate-pulse" />
            <div className="h-3 w-40 bg-primary/20 rounded animate-pulse" />
          </div>
          <div className="h-3.5 w-full bg-muted/20 rounded animate-pulse" />
          <div className="h-3.5 w-5/6 bg-muted/20 rounded animate-pulse" />
          <div className="h-3.5 w-4/6 bg-muted/15 rounded animate-pulse" />
        </div>
        {/* Impact cards skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/10 border border-muted/20 p-4 rounded-lg flex flex-col gap-2">
            <div className="h-2.5 w-3/4 bg-muted/25 rounded animate-pulse" />
            <div className="h-4 w-full bg-muted/15 rounded animate-pulse" />
          </div>
          <div className="bg-muted/10 border border-muted/20 p-4 rounded-lg flex flex-col gap-2">
            <div className="h-2.5 w-3/4 bg-muted/25 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-muted/15 rounded animate-pulse" />
          </div>
        </div>
        {/* Timeline skeleton */}
        <div className="flex flex-col gap-3">
          <div className="h-3 w-36 bg-primary/20 rounded animate-pulse" />
          <div className="border-l-2 border-primary/20 ml-2 pl-4 flex flex-col gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="relative flex flex-col gap-1.5">
                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-muted/30 animate-pulse" />
                <div className="h-3 w-1/2 bg-muted/20 rounded animate-pulse" />
                <div className="h-3 w-full bg-muted/15 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-muted/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {/* Actions skeleton */}
        <div className="flex flex-col gap-3">
          <div className="h-3 w-44 bg-green-500/20 rounded animate-pulse" />
          {[0, 1].map(i => (
            <div key={i} className="flex items-start gap-3 bg-muted/10 border border-muted/20 p-4 rounded-lg">
              <div className="w-4 h-4 rounded bg-muted/25 animate-pulse shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3.5 w-3/4 bg-muted/20 rounded animate-pulse" />
                <div className="h-3 w-full bg-muted/15 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-muted/10 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        {/* Synthesizing label */}
        <div className="flex items-center justify-center gap-2 mt-auto pt-4 border-t border-white/5">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-primary"
          />
          <span className="text-[9px] font-bold tracking-[0.2em] text-primary uppercase">AI Synthesizing Intelligence…</span>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }}
            className="w-1.5 h-1.5 rounded-full bg-primary"
          />
        </div>
      </div>
    );
  }

  if (!decisionData) {
    return (
      <div className="flex flex-col h-full w-full bg-background/60 p-6 items-center justify-center text-center border-l border-primary/20 backdrop-blur-md">
        <AlertTriangle size={42} className="text-warning mb-4 opacity-80" />
        <h3 className="text-lg font-bold text-white tracking-wide">INTELLIGENCE OFFLINE</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-[250px]">
          The AI Decision Engine could not generate a response. Please ensure your Python backend is running the latest routes.
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

  // Defensive: affected_industries may be a string (from old fallback) or array
  const industries = Array.isArray(impact_analysis?.affected_industries)
    ? impact_analysis.affected_industries
    : typeof impact_analysis?.affected_industries === 'string'
    ? [impact_analysis.affected_industries]
    : ['Logistics & Freight', 'Manufacturing', 'Trade'];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background/60 p-6 overflow-y-auto border-l border-primary/20 backdrop-blur-md">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6"
      >
        {/* Narrative Section */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
            <FileText size={14} /> Intelligence Narrative
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {narrative_explanation || '—'}
          </p>
        </motion.div>

        {/* Impact Analysis */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          <div className="bg-muted/10 border border-muted/20 p-4 rounded-lg">
            <span className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground mb-1">
              <AlertTriangle size={12} className="text-warning" /> AFFECTED SECTORS
            </span>
            <div className="text-sm text-foreground font-medium">
              {industries.join(', ')}
            </div>
          </div>
          <div className="bg-muted/10 border border-muted/20 p-4 rounded-lg">
            <span className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground mb-1">
              <Clock size={12} className="text-danger" /> ESTIMATED DELAY
            </span>
            <div className="text-sm text-foreground font-medium">
              {impact_analysis?.estimated_delay_timeline || '—'}
            </div>
          </div>
        </motion.div>

        {/* Time-Based Impact Timeline */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <h3 className="text-xs font-bold tracking-widest text-primary uppercase">
            Timeline Horizon
          </h3>
          <div className="flex flex-col border-l-2 border-primary/20 ml-2 pl-4 gap-4 relative">
            <div className="relative">
              <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-danger border-[3px] border-background" />
              <div className="text-xs font-bold text-white mb-0.5">Immediate (0-3 Days)</div>
              <div className="text-sm text-muted-foreground">{time_based_impact?.immediate || '—'}</div>
            </div>
            <div className="relative">
              <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-warning border-[3px] border-background" />
              <div className="text-xs font-bold text-white mb-0.5">Short Term (3-7 Days)</div>
              <div className="text-sm text-muted-foreground">{time_based_impact?.short_term || '—'}</div>
            </div>
            <div className="relative">
              <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-primary border-[3px] border-background" />
              <div className="text-xs font-bold text-white mb-0.5">Medium Term (7-14 Days)</div>
              <div className="text-sm text-muted-foreground">{time_based_impact?.medium_term || '—'}</div>
            </div>
          </div>
        </motion.div>

        {/* Action Recommendations */}
        {Array.isArray(action_recommendations) && action_recommendations.length > 0 && (
          <motion.div variants={itemVariants} className="flex flex-col gap-3 mt-2">
            <h3 className="flex items-center gap-2 text-xs font-bold tracking-widests text-success uppercase">
              <CheckCircle size={14} /> Recommended Actions
            </h3>
            <div className="flex flex-col gap-3">
              {action_recommendations.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-success/10 border border-success/20 p-4 rounded-lg group hover:bg-success/20 transition-colors">
                  <Navigation size={16} className="text-success mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{action?.strategy || '—'}</span>
                    <span className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors">
                      {action?.operational_suggestion || '—'}
                    </span>
                  </div>
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
