import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, FileText, AlertTriangle, Clock, CheckCircle, Navigation } from 'lucide-react';
import { useDecisionIntelligence } from '../../hooks/useData';

const DecisionPanel = ({ eventId }) => {
  const { decisionData, loading } = useDecisionIntelligence(eventId);

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full bg-card/40 p-6 pt-0 border-l border-border/40 animate-pulse gap-6">
        <div className="h-4 w-1/3 bg-muted/20 rounded mt-4" />
        <div className="h-32 w-full bg-muted/10 rounded" />
        <div className="h-6 w-1/2 bg-muted/20 rounded" />
        <div className="flex gap-4">
          <div className="flex-1 h-24 bg-muted/10 rounded" />
          <div className="flex-1 h-24 bg-muted/10 rounded" />
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

  const {
    narrative_explanation,
    impact_analysis,
    time_based_impact,
    action_recommendations
  } = decisionData;

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
            {narrative_explanation}
          </p>
        </motion.div>

        {/* Impact Analysis */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          <div className="bg-muted/10 border border-muted/20 p-4 rounded-lg">
            <span className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground mb-1">
              <AlertTriangle size={12} className="text-warning" /> AFFECTED SECTORS
            </span>
            <div className="text-sm text-foreground font-medium">
              {impact_analysis.affected_industries.join(", ")}
            </div>
          </div>
          <div className="bg-muted/10 border border-muted/20 p-4 rounded-lg">
            <span className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground mb-1">
              <Clock size={12} className="text-danger" /> ESTIMATED DELAY
            </span>
            <div className="text-sm text-foreground font-medium">
              {impact_analysis.estimated_delay_timeline}
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
              <div className="text-sm text-muted-foreground">{time_based_impact.immediate}</div>
            </div>
            <div className="relative">
              <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-warning border-[3px] border-background" />
              <div className="text-xs font-bold text-white mb-0.5">Short Term (3-7 Days)</div>
              <div className="text-sm text-muted-foreground">{time_based_impact.short_term}</div>
            </div>
            <div className="relative">
              <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-primary border-[3px] border-background" />
              <div className="text-xs font-bold text-white mb-0.5">Medium Term (7-14 Days)</div>
              <div className="text-sm text-muted-foreground">{time_based_impact.medium_term}</div>
            </div>
          </div>
        </motion.div>

        {/* Action Recommendations */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3 mt-2">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-widest text-success uppercase">
            <CheckCircle size={14} /> Recommended Actions
          </h3>
          <div className="flex flex-col gap-3">
            {action_recommendations.map((action, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-success/10 border border-success/20 p-4 rounded-lg group hover:bg-success/20 transition-colors">
                <Navigation size={16} className="text-success mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{action.strategy}</span>
                  <span className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors">
                    {action.operational_suggestion}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default DecisionPanel;
