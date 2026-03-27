import React from 'react';
import { Target, TrendingUp, AlertOctagon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { motion } from 'framer-motion';

const PredictionsPanel = ({ predictions }) => {
  if (!predictions) return (
    <Card className="flex flex-col gap-4 p-4 min-h-[300px] border-border bg-card shadow-lg bg-opacity-60 flex-1">
      <div className="h-6 w-2/5 rounded bg-muted/20 animate-pulse" />
      <div className="flex-1 rounded-lg bg-muted/10 animate-pulse" />
    </Card>
  );

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-white tracking-tight m-0">AI Predictions Engine</h3>
          <span className="bg-success/20 text-success px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">Active Forecast</span>
        </div>
        <button className="text-[10px] mono text-slate-500 uppercase hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center gap-1">
          Configuration <span className="material-symbols-outlined text-sm">settings_suggest</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {predictions.map((pred, idx) => {
          const riskColor = pred.risk_level.toLowerCase() === 'high' ? 'text-danger' :
            pred.risk_level.toLowerCase() === 'medium' ? 'text-warning' : 'text-low';
          const riskBg = pred.risk_level.toLowerCase() === 'high' ? 'bg-danger shadow-[0_0_8px_var(--danger-color)]' :
            pred.risk_level.toLowerCase() === 'medium' ? 'bg-warning shadow-[0_0_8px_var(--warning-color)]' : 'bg-low';

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="bg-[#151c25] p-5 rounded-sm border border-white/5 hover:border-white/10 transition-colors group h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 m-0">{pred.event_type}</h4>
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] mono">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      {pred.location.toUpperCase()}
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-sm bg-opacity-10 border mono font-bold ${riskColor} border-current opacity-80`}>
                    {(pred.probability * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-3 mb-4 flex-1">
                  <div>
                    <div className="flex justify-between text-[9px] mono text-slate-500 mb-1 uppercase">
                      <span>CONFIDENCE SCORE</span>
                      <span className="text-white">{pred.risk_level} IMPACT</span>
                    </div>
                    <div className="h-1 bg-[#2e353f] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pred.probability * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${riskBg.split(' ')[0]}`}
                      />
                    </div>
                  </div>
                  <div className="p-2 bg-[#2e353f]/30 rounded-sm">
                    <p className="text-[10px] text-slate-400 italic m-0 line-clamp-3">
                      "{pred.explanation}"
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default PredictionsPanel;
