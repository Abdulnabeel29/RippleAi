import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Printer, Shield, AlertTriangle, TrendingUp, TrendingDown, Globe,
  Factory, Zap, Clock, BarChart2, ChevronRight, Radio,
  Activity, MapPin, Cpu, FileText, RefreshCw, Crosshair
} from 'lucide-react';
import { generateBrief } from '../../services/api';

// ── Threat level config ────────────────────────────────────────────────────
const THREAT_CONFIG = {
  CRITICAL: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    bar: 'bg-red-500',
    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    label: 'CRITICAL',
  },
  ELEVATED: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    bar: 'bg-amber-500',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    label: 'ELEVATED',
  },
  STABLE: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    bar: 'bg-emerald-500',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    label: 'STABLE',
  },
};

// ── Typewriter hook ────────────────────────────────────────────────────────
function useTypewriter(text, speed = 18, active = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active || !text) { setDisplayed(text || ''); setDone(true); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, active]);
  return { displayed, done };
}

// ── Metric card ────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon, accent = 'text-white', trend = null, inverseTrend = false }) {
  let trendColor = 'text-white/30';
  let TrendIcon = null;
  
  if (trend !== null) {
    if (trend > 0) {
      trendColor = inverseTrend ? 'text-red-400' : 'text-emerald-400';
      TrendIcon = TrendingUp;
    } else if (trend < 0) {
      trendColor = inverseTrend ? 'text-emerald-400' : 'text-red-400';
      TrendIcon = TrendingDown;
    }
  }

  return (
    <div className="flex flex-col gap-2 p-5 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-colors relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={12} className={`${accent} opacity-60`} />
          <span className="mono text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{label}</span>
        </div>
        {trend !== null && trend !== 0 && (
          <div className={`flex items-center gap-1 ${trendColor} bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/[0.02]`}>
            <TrendIcon size={10} />
            <span className="mono text-[9px] font-black">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <span className={`text-3xl font-black tracking-tighter leading-none ${accent}`}>{value}</span>
    </div>
  );
}

// ── Severity pill ──────────────────────────────────────────────────────────
function SevPill({ severity }) {
  const map = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-white/5 text-white/40 border-white/10',
  };
  const cls = map[(severity || 'low').toLowerCase()] || map.low;
  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-black mono tracking-[0.15em] uppercase border ${cls}`}>
      {severity || 'LOW'}
    </span>
  );
}

// ── Horizontal bar ─────────────────────────────────────────────────────────
function HBar({ value, max, colorClass = 'bg-white/30' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`h-full rounded-full ${colorClass}`}
      />
    </div>
  );
}

// ── Print styles injected into head ───────────────────────────────────────
const PRINT_STYLE = `
@media print {
  /* Hide the main application entirely to remove all layout constraints */
  #root { 
    display: none !important; 
  }
  
  /* Reset the body so it can paginate infinitely */
  body { 
    background: white !important; 
    margin: 0 !important; 
    padding: 0 !important; 
    height: auto !important; 
    min-height: 100% !important;
    overflow: visible !important; 
    color: black !important;
  }

  /* The brief is mounted directly to body via portal. Set it to flow naturally. */
  #intel-brief-print { 
    position: static !important; 
    width: 100% !important; 
    max-width: 100% !important;
    height: auto !important; 
    overflow: visible !important; 
    background: #fff !important; 
    color: #000 !important; 
    display: block !important;
    transform: none !important;
    margin: 0 !important;
    padding: 20px !important;
    box-shadow: none !important;
    border: none !important;
  }
  
  /* Reset the inner scroll container to allow expansion */
  #intel-brief-scroll {
    overflow: visible !important;
    height: auto !important;
    display: block !important;
    position: static !important;
  }
  
  /* Ensure all text inside the brief prints in high-contrast black/white */
  #intel-brief-print * { 
    color: #000 !important; 
    background: transparent !important; 
    border-color: #ccc !important; 
    box-shadow: none !important; 
  }
  
  /* Completely hide buttons and UI elements not meant for the PDF */
  .no-print, .no-print * { 
    display: none !important; 
  }
}
`;

// ── Main component ─────────────────────────────────────────────────────────
export default function IntelligenceBrief({ isOpen, onClose }) {
  const [timeRange, setTimeRange] = useState('week');
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  // Inject print CSS once
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = PRINT_STYLE;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const fetchBrief = useCallback(async (range) => {
    setLoading(true);
    setError(null);
    setBrief(null);
    try {
      const data = await generateBrief(range);
      setBrief(data);
    } catch (err) {
      setError('Intelligence synthesis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when opened or time range changes
  useEffect(() => {
    if (isOpen) fetchBrief(timeRange);
  }, [isOpen, timeRange, fetchBrief]);

  const handlePrint = () => window.print();

  const threat = THREAT_CONFIG[brief?.threat_level] || THREAT_CONFIG.STABLE;
  const { displayed: narrative, done: narrativeDone } = useTypewriter(
    brief?.executive_summary || '',
    14,
    !!brief && !loading
  );

  const TABS = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ];

  const maxGeo = brief?.geographic_exposure?.[0]?.count || 1;
  const maxInd = brief?.industry_exposure?.[0]?.count || 1;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 no-print"
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.div
            id="intel-brief-print"
            ref={printRef}
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full md:w-[80vw] lg:w-[72vw] bg-[#05080f] border-l border-white/5 z-50 flex flex-col overflow-hidden shadow-[-40px_0_100px_rgba(0,0,0,0.8)]"
          >
            {/* ── Threat Level Strip ──────────────────────────── */}
            <div className={`h-1 w-full ${loading ? 'bg-white/10 animate-pulse' : threat.bar} transition-colors duration-700`} />

            {/* ── Header ─────────────────────────────────────── */}
            <div className="shrink-0 border-b border-white/5 bg-[#08090f] px-8 py-5 flex items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                  <FileText size={16} className="text-white/60" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-[0.25em] m-0">
                    Intelligence Brief
                  </h2>
                  <p className="mono text-[9px] text-white/30 uppercase tracking-[0.2em] m-0 mt-0.5">
                    RippleAI Neural Engine · {brief?.generated_at
                      ? new Date(brief.generated_at).toLocaleString()
                      : 'Generating…'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchBrief(timeRange)}
                  disabled={loading}
                  className="p-2 rounded-lg bg-white/[0.04] border border-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white disabled:opacity-30"
                  title="Regenerate"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-lg bg-white/[0.04] border border-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white"
                  title="Print / Save as PDF"
                >
                  <Printer size={14} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/[0.04] border border-white/5 hover:bg-white/10 transition-all text-white/40 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ── Time Range Tabs ─────────────────────────────── */}
            <div className="shrink-0 border-b border-white/5 bg-[#05080f] px-8 flex items-center gap-1 py-3 no-print">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTimeRange(tab.id)}
                  className={`px-4 py-1.5 rounded-md mono text-[10px] font-black uppercase tracking-widest transition-all ${
                    timeRange === tab.id
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Body ───────────────────────────────────────── */}
            <div id="intel-brief-scroll" className="flex-1 overflow-y-auto">

              {/* Loading skeleton */}
              {loading && (
                <div className="p-8 space-y-8">
                  <div className="flex items-center gap-3 mb-10">
                    <Radio size={16} className="text-white/20 animate-pulse" />
                    <span className="mono text-[10px] text-white/20 uppercase tracking-[0.3em] animate-pulse">
                      Synthesizing Intelligence · Neural Engine Active
                    </span>
                  </div>
                  {[140, 80, 80, 120, 100].map((h, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-white/[0.02] border border-white/5 animate-pulse"
                      style={{ height: h }}
                    />
                  ))}
                </div>
              )}

              {/* Error state */}
              {error && !loading && (
                <div className="p-8 flex flex-col items-center justify-center h-64 gap-4">
                  <AlertTriangle size={32} className="text-red-400/50" />
                  <p className="text-white/40 text-sm text-center">{error}</p>
                  <button
                    onClick={() => fetchBrief(timeRange)}
                    className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-[11px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* ── Brief Content ──────────────────────────── */}
              {brief && !loading && (
                <div className="p-8 space-y-10">

                  {/* SECTION 1 — Threat Level Banner */}
                  <section>
                    <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-xl border ${threat.bg} ${threat.border} ${threat.glow} relative overflow-hidden`}>
                      {/* Classified stamp */}
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.06] rotate-[-15deg] select-none pointer-events-none">
                        <span className="text-5xl font-black tracking-widest text-white border-4 border-white px-4 py-1">
                          CLASSIFIED
                        </span>
                      </div>
                      <div className="flex items-center gap-4 relative z-10">
                        <Shield size={32} className={threat.color} />
                        <div>
                          <p className="mono text-[9px] text-white/40 uppercase tracking-[0.3em] m-0">
                            System Threat Assessment
                          </p>
                          <h3 className={`text-3xl font-black tracking-tighter m-0 ${threat.color}`}>
                            {brief.threat_level}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="text-right">
                          <p className="mono text-[9px] text-white/30 uppercase tracking-widest m-0">Events</p>
                          <p className="text-2xl font-black text-white tracking-tighter m-0">
                            {brief.metrics.total_events}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="mono text-[9px] text-white/30 uppercase tracking-widest m-0">Critical</p>
                          <p className="text-2xl font-black text-red-400 tracking-tighter m-0">
                            {brief.metrics.critical_events}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="mono text-[9px] text-white/30 uppercase tracking-widest m-0">Predictions</p>
                          <p className="text-2xl font-black text-white tracking-tighter m-0">
                            {brief.metrics.active_predictions}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* SECTION 2 — Executive Summary */}
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <Cpu size={14} className="text-white/40 animate-pulse" />
                      <h4 className="mono text-[10px] font-black text-white/50 uppercase tracking-[0.25em] m-0">
                        Executive Intelligence Summary
                      </h4>
                    </div>
                    <div className="relative p-6 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="absolute -left-0 top-0 bottom-0 w-[2px] bg-white/10 rounded-l-xl" />
                      <p className="text-base text-white/75 leading-relaxed m-0 italic font-medium">
                        <span className="text-3xl text-white/15 absolute -left-1 -top-2 leading-none select-none">"</span>
                        {narrative}
                        {!narrativeDone && (
                          <span className="inline-block w-0.5 h-4 bg-white/60 ml-0.5 animate-pulse align-middle" />
                        )}
                        <span className="text-3xl text-white/15 leading-none select-none ml-1">"</span>
                      </p>
                    </div>
                  </section>

                  {/* SECTION 2.5 — Strategic Recommendations */}
                  {brief.recommended_actions && brief.recommended_actions.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <Crosshair size={14} className="text-white/40" />
                        <h4 className="mono text-[10px] font-black text-white/50 uppercase tracking-[0.25em] m-0">
                          Strategic Recommendations
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {brief.recommended_actions.map((action, i) => {
                          const prioMap = {
                            critical: 'border-red-500/30 bg-red-500/[0.02] hover:bg-red-500/[0.05]',
                            high: 'border-orange-500/30 bg-orange-500/[0.02] hover:bg-orange-500/[0.05]',
                            medium: 'border-blue-500/30 bg-blue-500/[0.02] hover:bg-blue-500/[0.05]',
                          };
                          const textMap = {
                            critical: 'text-red-400',
                            high: 'text-orange-400',
                            medium: 'text-blue-400',
                          };
                          const pcls = prioMap[(action.priority || 'medium').toLowerCase()] || prioMap.medium;
                          const tcls = textMap[(action.priority || 'medium').toLowerCase()] || textMap.medium;

                          return (
                            <div key={i} className={`p-5 rounded-xl border transition-colors flex flex-col h-full ${pcls}`}>
                              <div className="flex items-center justify-between mb-3">
                                <span className={`mono text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-current ${tcls} bg-current/10`}>
                                  ACTION 0{i + 1}
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-white mb-2 leading-tight">{action.title}</h5>
                              <p className="text-[11px] text-white/50 leading-relaxed m-0 mt-auto">{action.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* SECTION 3 — Threat Matrix (metrics grid) */}
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart2 size={14} className="text-white/40" />
                      <h4 className="mono text-[10px] font-black text-white/50 uppercase tracking-[0.25em] m-0">
                        Threat Matrix
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      <MetricCard label="Total Events" value={brief.metrics.total_events} trend={brief.metrics.total_events_trend} inverseTrend icon={Activity} />
                      <MetricCard label="Critical/High" value={brief.metrics.critical_events} trend={brief.metrics.critical_events_trend} inverseTrend icon={AlertTriangle} accent="text-red-400" />
                      <MetricCard label="Predictions" value={brief.metrics.active_predictions} icon={TrendingUp} accent="text-blue-400" />
                      <MetricCard label="Countries" value={brief.metrics.countries_affected} icon={Globe} accent="text-emerald-400" />
                      <MetricCard label="Industries" value={brief.metrics.industries_affected} icon={Factory} accent="text-amber-400" />
                    </div>

                    {/* Severity breakdown bar */}
                    <div className="mt-4 p-5 bg-white/[0.02] border border-white/5 rounded-xl">
                      <p className="mono text-[9px] text-white/30 uppercase tracking-[0.2em] mb-3">Severity Distribution</p>
                      <div className="flex gap-2 h-6 rounded-lg overflow-hidden">
                        {['critical', 'high', 'medium', 'low'].map(sev => {
                          const count = brief.metrics.severity_breakdown?.[sev] || 0;
                          const pct = brief.metrics.total_events > 0 ? (count / brief.metrics.total_events) * 100 : 0;
                          if (pct === 0) return null;
                          const colors = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-white/15' };
                          return (
                            <motion.div
                              key={sev}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                              title={`${sev}: ${count}`}
                              className={`${colors[sev]} rounded flex items-center justify-center overflow-hidden`}
                            >
                              {pct > 10 && (
                                <span className="mono text-[8px] font-black text-white/80 uppercase">{sev[0]}</span>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className="flex gap-4 mt-2">
                        {['critical', 'high', 'medium', 'low'].map(sev => {
                          const count = brief.metrics.severity_breakdown?.[sev] || 0;
                          const colors = { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-amber-400', low: 'text-white/30' };
                          return (
                            <div key={sev} className="flex items-center gap-1">
                              <span className={`mono text-[9px] font-black ${colors[sev]} uppercase`}>{sev}: {count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* SECTION 4 — Top Disruptions & Predictions side by side */}
                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      {/* Top Events */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <AlertTriangle size={14} className="text-red-400/60" />
                          <h4 className="mono text-[10px] font-black text-white/50 uppercase tracking-[0.25em] m-0">
                            Top Disruptions
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {brief.top_events.length === 0 && (
                            <p className="text-white/20 text-xs italic">No events in this window.</p>
                          )}
                          {brief.top_events.map((evt, i) => (
                            <div key={evt.id || i} className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors group">
                              <span className="mono text-[9px] font-black text-white/20 mt-0.5 shrink-0 w-5">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <SevPill severity={evt.severity} />
                                  <span className="text-[10px] font-black text-white uppercase tracking-tight truncate">
                                    {evt.event_type?.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-white/30">
                                  <MapPin size={9} />
                                  <span className="mono text-[9px] truncate">{evt.location || evt.country}</span>
                                  {evt.industry && (
                                    <span className="mono text-[9px] text-white/20">· {evt.industry}</span>
                                  )}
                                </div>
                                {evt.summary && (
                                  <p className="text-[10px] text-white/40 mt-1.5 leading-relaxed line-clamp-2 m-0">
                                    {evt.summary}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Predictions */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <TrendingUp size={14} className="text-blue-400/60" />
                          <h4 className="mono text-[10px] font-black text-white/50 uppercase tracking-[0.25em] m-0">
                            Top Predictions
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {brief.top_predictions.length === 0 && (
                            <p className="text-white/20 text-xs italic">No predictions available.</p>
                          )}
                          {brief.top_predictions.map((pred, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                                <span className="mono text-[9px] font-black text-white/20 w-5">
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-black text-white uppercase tracking-tight truncate">
                                    {pred.event_type?.replace(/_/g, ' ')}
                                  </span>
                                  <span className="mono text-lg font-black text-white/80 leading-none shrink-0">
                                    {Math.round((pred.probability || 0) * 100)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-white/30 mb-2">
                                  <MapPin size={9} />
                                  <span className="mono text-[9px]">{pred.location}</span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.round((pred.probability || 0) * 100)}%` }}
                                    transition={{ duration: 1, delay: i * 0.1 }}
                                    className={`h-full rounded-full ${
                                      pred.risk_level?.toLowerCase() === 'high' || pred.risk_level?.toLowerCase() === 'critical'
                                        ? 'bg-red-500' : pred.risk_level?.toLowerCase() === 'medium'
                                        ? 'bg-amber-500' : 'bg-blue-500'
                                    }`}
                                  />
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Clock size={9} className="text-white/20" />
                                  <span className="mono text-[9px] text-white/30">
                                    Est. +{pred.expected_delay_days}d delay
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* SECTION 5 — Geographic & Industry Exposure */}
                  <section>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      {/* Geographic exposure */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <Globe size={14} className="text-emerald-400/60" />
                          <h4 className="mono text-[10px] font-black text-white/50 uppercase tracking-[0.25em] m-0">
                            Geographic Exposure
                          </h4>
                        </div>
                        <div className="space-y-3 p-5 bg-white/[0.02] border border-white/5 rounded-xl">
                          {brief.geographic_exposure.length === 0 && (
                            <p className="text-white/20 text-xs italic">No location data available.</p>
                          )}
                          {brief.geographic_exposure.map((g, i) => (
                            <div key={i} className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <SevPill severity={g.severity} />
                                  <span className="text-[11px] font-bold text-white/80 uppercase tracking-tight">{g.country}</span>
                                </div>
                                <span className="mono text-[10px] text-white/40 font-black">{g.count} event{g.count !== 1 ? 's' : ''}</span>
                              </div>
                              <HBar value={g.count} max={maxGeo} colorClass="bg-emerald-500/50" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Industry exposure */}
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <Factory size={14} className="text-amber-400/60" />
                          <h4 className="mono text-[10px] font-black text-white/50 uppercase tracking-[0.25em] m-0">
                            Industry Exposure
                          </h4>
                        </div>
                        <div className="space-y-3 p-5 bg-white/[0.02] border border-white/5 rounded-xl">
                          {brief.industry_exposure.length === 0 && (
                            <p className="text-white/20 text-xs italic">No industry data available.</p>
                          )}
                          {brief.industry_exposure.map((ind, i) => (
                            <div key={i} className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-white/80 uppercase tracking-tight">{ind.industry}</span>
                                <span className="mono text-[10px] text-white/40 font-black">{ind.count} event{ind.count !== 1 ? 's' : ''}</span>
                              </div>
                              <HBar value={ind.count} max={maxInd} colorClass="bg-amber-500/50" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Footer stamp */}
                  <div className="flex items-center justify-between pt-6 border-t border-white/5 pb-4">
                    <span className="mono text-[9px] text-white/20 uppercase tracking-[0.2em]">
                      RippleAI Intelligence Engine · Auto-generated · {new Date(brief.generated_at).toUTCString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                      <span className="mono text-[9px] text-white/20 uppercase tracking-widest">Neural Sync</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
