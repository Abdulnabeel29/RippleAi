import React, { useState } from 'react';
import { Clock, MapPin, ChevronRight, Activity, Terminal, Shield, Cpu, Database, Search, Radio, Layers } from 'lucide-react';
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
  const [logs, setLogs] = useState(MASTER_LOGS);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleClearLogs = () => {
    setLogs([]);
  };

  // Reset pagination when events change (e.g. filtered by location)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [events]);

  const totalPages = Math.ceil(events.length / itemsPerPage);
  const paginatedEvents = events.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!events) return (
    <div className="flex flex-col gap-4 p-6 min-h-[300px] glass-panel opacity-60">
      <div className="h-6 w-1/3 rounded bg-white/5 animate-pulse" />
      <div className="h-20 w-full rounded bg-white/5 animate-pulse" />
      <div className="h-20 w-full rounded bg-white/5 animate-pulse" />
    </div>
  );

  const getLogIcon = (type) => {
    switch (type) {
      case 'SCRAPE': return <Search size={10} className="text-blue-400" />;
      case 'AI_DETECTION': return <Cpu size={10} className="text-secondary" />;
      case 'GRAPH': return <Database size={10} className="text-primary" />;
      default: return <Terminal size={10} className="text-slate-400" />;
    }
  };

  return (
    <>
      <div className="flex flex-col w-full px-6 lg:px-10 py-4">
        {/* HUD Signal Header */}
        <div className="flex items-center justify-between mb-8 px-4 border-l-2 border-secondary/20 pl-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-black text-white tracking-tighter m-0 uppercase italic flex items-center gap-3">
              <Radio size={20} className="text-secondary animate-pulse" />
              Intelligence Signal Feed
            </h3>
            <div className="flex items-center gap-2">
              <span className="mono text-[9px] font-black tracking-extreme text-slate-500 uppercase">TELEMETRY_STREAM_V4 :: ONLINE</span>
              <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="mono text-[10px] text-slate-500 uppercase tracking-widest font-black">Signals</span>
              <span className="text-xl font-black text-white tracking-tighter italic">Count::{events.length.toString().padStart(3, '0')}</span>
            </div>
            <button 
              onClick={() => setIsLogsOpen(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white hover:text-black transition-all duration-300"
            >
              <Terminal size={14} className="group-hover:rotate-12 transition-transform" />
              <span className="mono text-[9px] font-black uppercase tracking-widest">Master Logs</span>
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col relative w-full border border-white/5">
          {/* Subtle Scanning Mesh Overlay */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8 relative z-10">
          {paginatedEvents.map((evt, idx) => {
            const isSelected = selectedEventId === evt.id;
            const severity = evt.severity.toLowerCase();

            const styles = {
              pipe: severity === 'high' || severity === 'critical' ? 'status-pipe-red' : severity === 'medium' ? 'status-pipe-amber' : 'status-pipe-blue',
              accent: severity === 'high' || severity === 'critical' ? 'text-danger' : severity === 'medium' ? 'text-warning' : 'text-primary',
              glow: severity === 'high' || severity === 'critical' ? 'bg-danger/20 shadow-[0_0_20px_#ef4444]' : severity === 'medium' ? 'bg-warning/20 shadow-[0_0_20px_#f59e0b]' : 'bg-primary/20 shadow-[0_0_20px_#3b82f6]',
            };

            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
              >
                <div
                  onClick={() => onEventSelect(evt)}
                  className={`
                    group cursor-pointer flex flex-col gap-4 p-6 rounded-xl border transition-all duration-500 relative overflow-hidden h-full
                    ${isSelected ? 'bg-white/[0.08] border-white/20 shadow-2xl' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'}
                  `}
                >
                  {/* Left Status Pipe */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${styles.pipe}`} />

                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                         <Layers size={12} className={styles.accent} />
                         <span className="mono text-[8px] font-black tracking-widest text-white/40 uppercase">Cluster::{idx.toString().padStart(3, '0')}</span>
                      </div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight italic m-0">
                        {evt.event_type}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Clock size={10} className="text-white/40" />
                      <span className="mono text-[8px] text-white/60 font-bold uppercase tracking-tighter">
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
                  </div>

                  <p className="text-[12px] text-white/60 font-medium line-clamp-2 m-0 h-9 relative">
                    <span className="absolute -left-1 opacity-20 text-lg">“</span>
                    {evt.summary}
                    <span className="opacity-20 text-lg ml-1">”</span>
                  </p>

                  <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-white/5 relative z-10">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 group-hover:bg-white/10 transition-colors">
                        <MapPin size={10} className={styles.accent} />
                        <span className="mono text-[9px] font-black text-white/80 uppercase tracking-tight">{evt.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                         <div className={`w-1.5 h-1.5 rounded-full ${styles.glow}`} />
                         <span className={`mono text-[9px] font-black uppercase ${styles.accent}`}>{(evt.confidence_score * 100).toFixed(0)}% Conf</span>
                      </div>
                    </div>
                  </div>

                  {/* High-Fidelity HUD Arrow Icon */}
                  <div className={`absolute right-4 bottom-4 transition-all duration-500 scale-75 ${isSelected ? 'text-primary opacity-100 translate-x-0' : 'opacity-0 translate-x-2 group-hover:opacity-60 group-hover:translate-x-0 group-hover:text-primary'}`}>
                    <ChevronRight size={18} strokeWidth={3} />
                  </div>
                </div>
              </motion.div>
            );
          })}
          {events.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center animate-pulse border border-white/10">
                 <Search size={20} className="text-white/20" />
              </div>
              <span className="mono text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Listening for Incoming Signals...</span>
            </div>
          )}
          </div>
          
          <div className="p-4 bg-white/[0.03] border-t border-white/5 flex justify-center items-center gap-3">
             <div className="flex h-1 gap-1 items-center">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className={`h-full w-1 rounded-full ${i <= 3 ? 'bg-primary animate-pulse' : 'bg-white/10'}`} style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
             </div>
             <span className="mono text-[8px] font-black text-white/30 uppercase tracking-[0.4em]">Satellite Link Active :: Encryption Multi-Layered :: 12.8ms Latency</span>
          </div>
        </div>

        {/* Elite Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-8 bg-white/[0.02] border border-white/5 rounded-xl px-6 py-4 backdrop-blur-md">
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
      </div>

      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="max-w-4xl bg-[#05080f]/95 backdrop-blur-2xl border border-white/10 text-white p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10 rounded-2xl">
          <DialogHeader className="p-6 border-b border-white/10 bg-white/[0.02]">
            <div className="flex justify-between items-center">
               <div className="flex flex-col gap-1">
                  <DialogTitle className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                    <Terminal size={20} className="text-primary animate-pulse" />
                    Operational Telemetry Matrix
                  </DialogTitle>
                  <DialogDescription className="mono text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Real-time structural log stream from RippleAI Autonomous Workers
                  </DialogDescription>
               </div>
               <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-md">
                   <span className="mono text-[10px] font-black text-primary uppercase">Active Session::V4.2</span>
               </div>
            </div>
          </DialogHeader>

          <div className="p-2 bg-black/40 font-mono text-[11px] overflow-y-auto max-h-[500px]">
             {/* Terminal Header Decoration */}
             <div className="p-4 flex flex-col gap-2 relative bg-black/20 rounded-xl m-2 border border-white/5">
                <div className="flex gap-1.5 mb-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-danger/40" />
                   <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
                   <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
                </div>
                
                <div className="flex flex-col gap-1.5 leading-relaxed overflow-x-hidden">
                  {logs.length > 0 ? logs.map((log) => (
                    <div key={log.id} className="flex gap-4 hover:bg-white/[0.03] py-1 px-3 rounded-lg transition-colors group cursor-default">
                      <span className="text-white/20 shrink-0 font-bold tracking-tighter">[{log.time}]</span>
                      <span className={`shrink-0 w-24 flex items-center gap-1.5 font-black uppercase italic ${
                        log.type === 'SCRAPE' ? 'text-blue-400' : 
                        log.type === 'AI_DETECTION' ? 'text-secondary' : 
                        log.type === 'GRAPH' ? 'text-primary' : 'text-slate-400'
                      }`}>
                        {getLogIcon(log.type)}
                        {log.type}
                      </span>
                      <span className="text-white/60 group-hover:text-white transition-colors">{log.msg}</span>
                    </div>
                  )) : (
                    <div className="py-10 text-center opacity-20 mono text-[10px] uppercase tracking-widest">
                       Log Buffer Cleared...
                    </div>
                  )}
                  
                  <div className="text-primary mt-4 flex items-center gap-3 px-3 py-2 bg-primary/5 rounded-lg border border-primary/10 animate-pulse">
                    <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_#3b82f6]" />
                    <span className="font-black uppercase tracking-[0.1em]">Signal Handshake Active :: Monitoring News Cluster 0xF8...</span>
                  </div>
                </div>
             </div>
          </div>

          <div className="p-6 bg-white/[0.02] border-t border-white/10 flex justify-end gap-4">
             <button 
               onClick={handleClearLogs}
               className="mono text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
             >
               Clear Logs
             </button>
             <button 
               onClick={() => setIsLogsOpen(false)}
               className="px-6 py-2 bg-white text-[#05080f] font-black rounded-lg text-[10px] uppercase tracking-widest transition-all hover:bg-[#3b82f6] hover:text-white active:scale-95 shadow-xl"
             >
               Exit Terminal
             </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventFeed;
