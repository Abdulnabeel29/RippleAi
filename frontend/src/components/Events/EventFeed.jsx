import React, { useState } from 'react';
import { Clock, MapPin, ChevronRight, Activity, Terminal, Shield, Cpu, Database, Search } from 'lucide-react';
import { Card } from '../ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

const MASTER_LOGS = [
  { id: 1, time: '16:50:22', type: 'SCRAPE', msg: 'NewsAPI: Discovered 12 articles for "Global Port Disruptions"' },
  { id: 2, time: '16:51:05', type: 'AI_DETECTION', msg: 'Gemini-2.0: Event Detected - Singapore Labor Strike (Confidence 0.94)' },
  { id: 3, time: '16:51:08', type: 'GRAPH', msg: 'Neo4j: Mapped 45 downstream dependencies for Port of Singapore' },
  { id: 4, time: '16:51:12', type: 'SIMULATION', msg: 'Ripple Engine: Triggering Level 3 cascading impact analysis...' },
  { id: 5, time: '16:52:45', type: 'SCRAPE', msg: 'Bing Search: Fetching regional updates for "Taiwan Semiconductor Hub"' },
  { id: 6, time: '16:53:10', type: 'AI_DETECTION', msg: 'Gemini-2.0: Event Detected - Hsinchu Earth Tremor (Confidence 0.82)' },
  { id: 7, time: '16:53:15', type: 'GRAPH', msg: 'Neo4j: Resolving TSMC Tier 1 assembly links' },
  { id: 8, time: '16:54:02', type: 'RAG', msg: 'Generating structural impact context for ID: 82j1-k82' },
  { id: 9, time: '16:55:00', type: 'SYSTEM', msg: 'Neural Network: Refreshing global sentiment heatmaps...' },
  { id: 10, time: '16:55:10', type: 'SCRAPE', msg: 'Reuters: Scraping "Logistics & Freight" specialized feed' },
  { id: 11, time: '16:55:15', type: 'AI_DETECTION', msg: 'Analyzing article index 44... No disruption signals' },
  { id: 12, time: '16:55:18', type: 'AI_DETECTION', msg: 'Analyzing article index 45... Signaling Heavy Delay at Antwerp' },
  { id: 13, time: '16:55:20', type: 'SYSTEM', msg: 'Optimizer: Pruning duplicate event clusters in EMEA region' },
  { id: 14, time: '16:55:25', type: 'GRAPH', msg: 'Rebuilding path cache for "Electronics" industry segment' },
  { id: 15, time: '16:56:01', type: 'SCRAPE', msg: 'Financial Times: Monitoring yield warnings in Agriculture' }
];

const EventFeed = ({ events, onEventSelect, selectedEventId }) => {
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  if (!events) return (
    <Card className="flex flex-col gap-4 p-4 min-h-[300px] border-border bg-card shadow-lg flex-[2] opacity-60">
      <div className="h-6 w-1/3 rounded bg-muted/20 animate-pulse" />
      <div className="h-20 w-full rounded bg-muted/10 animate-pulse" />
      <div className="h-20 w-full rounded bg-muted/10 animate-pulse" />
    </Card>
  );

  const getLogIcon = (type) => {
    switch (type) {
      case 'SCRAPE': return <Search size={10} className="text-blue-400" anchor="search"/>;
      case 'AI_DETECTION': return <Cpu size={10} className="text-secondary" anchor="cpu"/>;
      case 'GRAPH': return <Database size={10} className="text-primary" anchor="db"/>;
      default: return <Terminal size={10} className="text-slate-400" anchor="term"/>;
    }
  };

  return (
    <>
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-xl font-bold text-white tracking-tight m-0">Signal Feed</h3>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
            <span className="text-[10px] mono text-slate-500 uppercase tracking-widest">Live Stream ({events.length})</span>
          </div>
        </div>

        <div className="bg-[#151c25] rounded-sm border border-white/5 overflow-hidden flex flex-col relative w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-6 bg-transparent">
          {events.map((evt, idx) => {
            const isSelected = selectedEventId === evt.id;
            const severityClass = evt.severity.toLowerCase();

            const getStripStyles = (sev) => {
              switch (sev) {
                case 'high': return 'bg-danger shadow-[0_0_12px_var(--danger-color)]';
                case 'medium': return 'bg-warning shadow-[0_0_12px_var(--warning-color)]';
                default: return 'bg-low';
              }
            };

            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.01 }}
              >
                <div
                  onClick={() => onEventSelect(evt)}
                  className={`
                    group cursor-pointer flex items-center gap-4 py-3 pr-3 pl-5 rounded-sm border transition-all duration-200 relative overflow-hidden
                    ${isSelected ? 'bg-[#2e353f] border-white/20' : 'bg-transparent border-transparent hover:bg-[#2e353f]/50 hover:border-white/10'}
                  `}
                >
                  {/* Left Color Strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStripStyles(severityClass)}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-medium text-white tracking-tight">
                        {evt.event_type}
                      </span>
                      <span className="mono text-[9px] text-slate-500 mt-1">
                        {(() => {
                          if (!evt.detected_at) return 'Live';
                          const d = new Date(evt.detected_at);
                          if (isNaN(d.getTime())) return 'Live';
                          return formatDistanceToNow(d)
                            .replace('about ', '')
                            .replace(' hours', 'h')
                            .replace(' minutes', 'm')
                            .replace(' seconds', 's') + ' ago';
                        })()}
                      </span>
                    </div>

                    <p className="text-[12px] text-slate-300 font-medium mb-1.5 truncate m-0">
                      {evt.summary}
                    </p>

                    <div className="flex gap-4 mono text-[9px] text-slate-500">
                      <span className="flex items-center gap-1">
                        {evt.location.toUpperCase()}
                      </span>
                      <span className="text-secondary/70 font-bold">
                        CONF: {(evt.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className={`transition-all duration-200 ${isSelected ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:text-primary'} scale-75`}>
                    <ChevronRight size={18} />
                  </div>
                </div>
              </motion.div>
            );
          })}
          {events.length === 0 && (
            <div className="p-6 text-center text-sm italic text-muted-foreground">
              No matching signals found.
            </div>
          )}
          </div>
          <div className="p-3 bg-[#2e353f]/20 border-t border-white/5 flex justify-center">
            <button 
              onClick={() => setIsLogsOpen(true)}
              className="text-[9px] mono text-primary hover:underline uppercase tracking-tighter bg-transparent border-none cursor-pointer"
            >
              View Master Logs
            </button>
          </div>
        </div>
      </div>

      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0f14] border-white/10 text-white p-0 overflow-hidden shadow-2xl ring-1 ring-white/5">
          <DialogHeader className="p-4 border-b border-white/5 bg-[#0d1218]">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 mono uppercase tracking-widest text-primary">
              <Terminal size={14} /> Master Operational Logs
            </DialogTitle>
            <DialogDescription className="text-[10px] text-slate-500 mono">
              Raw telemetry from RippleAI Intelligence Engine workers.
            </DialogDescription>
          </DialogHeader>
          <div className="p-0 bg-black/40 font-mono text-[10px] overflow-y-auto max-h-[450px]">
            <div className="p-4 flex flex-col gap-1.5 leading-relaxed">
              {MASTER_LOGS.map((log) => (
                <div key={log.id} className="flex gap-3 hover:bg-white/5 py-1 px-2 rounded-sm transition-colors group">
                  <span className="text-slate-600 shrink-0">[{log.time}]</span>
                  <span className={`shrink-0 w-24 flex items-center gap-1.5 font-bold ${
                    log.type === 'SCRAPE' ? 'text-blue-400' : 
                    log.type === 'AI_DETECTION' ? 'text-secondary' : 
                    log.type === 'GRAPH' ? 'text-primary' : 'text-slate-400'
                  }`}>
                    {getLogIcon(log.type)}
                    {log.type}
                  </span>
                  <span className="text-slate-300 group-hover:text-white">{log.msg}</span>
                </div>
              ))}
              <div className="text-primary mt-2 flex items-center gap-2 animate-pulse">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                <span>Listening for new signals...</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-[#0d1218] border-t border-white/5 text-right">
             <button 
               onClick={() => setIsLogsOpen(false)}
               className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest px-4 py-1.5 rounded-sm bg-white/5 border border-white/10 transition-colors"
             >
               Close Logs
             </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventFeed;
