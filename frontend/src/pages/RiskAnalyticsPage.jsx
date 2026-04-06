import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Activity, ShieldAlert, Cpu, Layers, AlertTriangle,
  MapPin, Clock, Target, Shield, Globe, Eye, TrendingUp,
} from 'lucide-react';
import { useIntelligenceData, useEventSimulation } from '../hooks/useData';
import ImpactSimulationView from '../components/Simulation/ImpactSimulationView';
import { format } from 'date-fns';

/* ─── helpers ───────────────────────────────────────────────────────── */
const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

const GEO_BAR_COLOR = { critical: 'bg-danger', high: 'bg-orange-400', medium: 'bg-warning', low: 'bg-success' };
const GEO_TEXT_COLOR = { critical: 'text-danger', high: 'text-orange-400', medium: 'text-warning', low: 'text-success' };

const RISK_STYLES = {
  CRITICAL: { color: 'text-danger',   border: 'border-danger/30',   bg: 'bg-danger/10',   pipe: 'bg-danger'   },
  ELEVATED: { color: 'text-warning',  border: 'border-warning/30',  bg: 'bg-warning/10',  pipe: 'bg-warning'  },
  MODERATE: { color: 'text-[#3b82f6]',border: 'border-[#3b82f6]/30',bg: 'bg-[#3b82f6]/10',pipe: 'bg-[#3b82f6]'},
  NOMINAL:  { color: 'text-success',  border: 'border-success/30',  bg: 'bg-success/10',  pipe: 'bg-success'  },
};

const ACTION_STYLES = {
  immediate: { color: 'text-danger',   border: 'border-danger/20',   bg: 'bg-danger/5',   dot: 'bg-danger',   Icon: AlertTriangle },
  monitor:   { color: 'text-warning',  border: 'border-warning/20',  bg: 'bg-warning/5',  dot: 'bg-warning',  Icon: Eye           },
  strategic: { color: 'text-success',  border: 'border-success/20',  bg: 'bg-success/5',  dot: 'bg-success',  Icon: Target        },
};

/* ─── component ─────────────────────────────────────────────────────── */
const RiskAnalyticsPage = () => {
  const { events, predictions, loading } = useIntelligenceData();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { simulationData, impactData } = useEventSimulation(selectedEvent?.id);

  /* severity breakdown */
  const sevBreak = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    events.forEach(e => { const s = e.severity?.toLowerCase(); if (c[s] !== undefined) c[s]++; });
    return c;
  }, [events]);

  /* global risk score 0-100 */
  const riskScore = useMemo(() => {
    if (!events.length) return 0;
    return Math.min(100, Math.round((sevBreak.critical * 100 + sevBreak.high * 70 + sevBreak.medium * 40 + sevBreak.low * 10) / events.length));
  }, [events, sevBreak]);

  /* avg confidence */
  const avgConf = useMemo(() => {
    if (!events.length) return 0;
    return Math.round(events.reduce((a, e) => a + (e.confidence_score || 0), 0) / events.length * 100);
  }, [events]);

  /* type breakdown */
  const typeBreak = useMemo(() => {
    const c = {};
    events.forEach(e => { const t = e.event_type || 'unknown'; c[t] = (c[t] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [events]);

  /* geographic breakdown – ALL regions */
  const geoBreak = useMemo(() => {
    const counts = {}, worst = {};
    events.forEach(e => {
      const loc = e.location || 'Unknown';
      counts[loc] = (counts[loc] || 0) + 1;
      const s = e.severity?.toLowerCase() || 'low';
      if (worst[loc] === undefined || SEV_RANK[s] < SEV_RANK[worst[loc]]) worst[loc] = s;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([loc, count]) => ({ loc, count, sev: worst[loc] || 'low' }));
  }, [events]);

  /* type × severity matrix (top 8) */
  const typeMatrix = useMemo(() => {
    const m = {};
    events.forEach(e => {
      const t = e.event_type || 'unknown';
      const s = e.severity?.toLowerCase() || 'low';
      if (!m[t]) m[t] = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
      if (m[t][s] !== undefined) m[t][s]++;
      m[t].total++;
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  }, [events]);

  /* confidence bands */
  const confBands = useMemo(() => {
    const b = [
      { label: '90%+',   min: 90, count: 0, color: 'bg-success',      text: 'text-success'       },
      { label: '70–89%', min: 70, count: 0, color: 'bg-[#3b82f6]',   text: 'text-[#3b82f6]'    },
      { label: '50–69%', min: 50, count: 0, color: 'bg-warning',      text: 'text-warning'       },
      { label: '<50%',   min: 0,  count: 0, color: 'bg-danger',       text: 'text-danger'        },
    ];
    events.forEach(e => {
      const c = Math.round((e.confidence_score || 0) * 100);
      for (let i = 0; i < b.length; i++) {
        if (c >= b[i].min) { b[i].count++; break; }
      }
    });
    return b;
  }, [events]);

  /* threat timeline – real detected_at grouped by day */
  const timeline = useMemo(() => {
    const d = {};
    events.forEach(e => {
      if (!e.detected_at) return;
      const dt = new Date(e.detected_at);
      if (isNaN(dt.getTime())) return;
      const k = dt.toISOString().split('T')[0];
      d[k] = (d[k] || 0) + 1;
    });
    return Object.entries(d)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ label: format(new Date(date), 'MMM d'), count, date }));
  }, [events]);

  const maxTL = Math.max(...timeline.map(t => t.count), 1);
  const maxGeo = geoBreak[0]?.count || 1;

  /* decision intelligence */
  const decision = useMemo(() => {
    const critHigh = sevBreak.critical + sevBreak.high;
    const level = critHigh > 20 ? 'CRITICAL' : critHigh > 10 ? 'ELEVATED' : critHigh > 3 ? 'MODERATE' : 'NOMINAL';
    const threat = (typeBreak[0]?.[0] || 'unknown').replace(/_/g, ' ');
    const hotspot = geoBreak[0]?.loc || 'Unknown';
    const hPct = events.length > 0 ? Math.round((geoBreak[0]?.count || 0) / events.length * 100) : 0;

    const actions = [];
    if (sevBreak.critical > 0) {
      actions.push({ type: 'immediate', title: 'Immediate Escalation Required', text: `${sevBreak.critical} Critical disruption${sevBreak.critical > 1 ? 's' : ''} active. Activate emergency response protocols and initiate direct supplier escalation now.` });
    } else {
      actions.push({ type: 'monitor', title: 'Elevated Monitoring Active', text: `No Critical events at present. Maintain heightened monitoring — ${sevBreak.high} High-risk events remain active and may escalate.` });
    }
    actions.push({ type: 'monitor', title: `Geographic Focus — ${hotspot}`, text: `${hPct}% of active disruptions are concentrated in ${hotspot} (${geoBreak[0]?.count || 0} events). Evaluate alternative logistics corridors and activate regional backup suppliers.` });
    actions.push({ type: 'strategic', title: `Resilience Strategy — ${threat}`, text: `"${threat}" is the dominant disruption vector (${typeBreak[0]?.[1] || 0} events). Build long-term resilience through supplier diversification and strategic inventory pre‑positioning.` });

    return { level, threat, hotspot, hPct, actions };
  }, [events, sevBreak, typeBreak, geoBreak]);

  const rStyle = RISK_STYLES[decision.level] || RISK_STYLES.NOMINAL;
  const scoreColor = riskScore >= 70 ? 'text-danger' : riskScore >= 50 ? 'text-warning' : riskScore >= 30 ? 'text-[#3b82f6]' : 'text-success';

  const KPI = ({ label, value, unit, Icon, valueClass, sub, delay }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-3 relative overflow-hidden group">
      <div className="flex justify-between items-start">
        <span className="mono text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{label}</span>
        <Icon size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-black tracking-tighter ${valueClass}`}>{value}</span>
        {unit && <span className="text-white/20 text-sm font-bold">{unit}</span>}
      </div>
      <span className="mono text-[8px] font-black text-white/20 uppercase tracking-widest">{sub}</span>
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px,transparent 1px)', backgroundSize: '16px 16px' }} />
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-12 p-8 md:p-12 bg-[#05080f] min-h-full">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 border-l-2 border-white/10 pl-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10"><BarChart3 size={24} className="text-white" /></div>
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter m-0 uppercase italic">Risk Matrix</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="mono text-[9px] font-black tracking-extreme text-white/20 uppercase">Decision_Intelligence_v4.2</span>
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_#10b981]" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="mono text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-1">Assessment</span>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${rStyle.border} ${rStyle.bg}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${rStyle.pipe} animate-pulse`} />
              <span className={`mono text-[11px] font-black uppercase tracking-widest ${rStyle.color}`}>{decision.level}</span>
            </div>
          </div>
          <div className="w-px h-10 bg-white/5 hidden lg:block" />
          <div className="flex flex-col items-end">
            <span className="mono text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-1">Active Scenarios</span>
            <span className="text-2xl font-black text-white tracking-tighter italic">{events.length.toString().padStart(3, '0')}</span>
          </div>
        </div>
      </div>

      {/* ── Section 1: Executive KPI Scorecard ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPI label="Global Risk Score"   value={riskScore}     unit="/ 100" Icon={Shield}        valueClass={scoreColor}                                          sub={riskScore >= 70 ? 'HIGH EXPOSURE' : riskScore >= 50 ? 'ELEVATED' : 'CONTROLLED'} delay={0.05} />
        <KPI label="Active Scenarios"    value={events.length.toString().padStart(3,'0')} unit="" Icon={Activity}     valueClass="text-white"                      sub="LIVE EVENTS"        delay={0.10} />
        <KPI label="Critical + High"     value={(sevBreak.critical+sevBreak.high).toString().padStart(3,'0')} unit="" Icon={AlertTriangle} valueClass={sevBreak.critical>0?'text-danger':'text-warning'} sub={`${sevBreak.critical} CRITICAL`} delay={0.15} />
        <KPI label="Avg AI Confidence"   value={`${avgConf}%`} unit=""      Icon={Cpu}          valueClass={avgConf>=80?'text-success':'text-warning'}           sub="MODEL CERTAINTY"    delay={0.20} />
        <KPI label="Regions Affected"    value={geoBreak.length.toString().padStart(3,'0')} unit="" Icon={Globe}        valueClass="text-white"                      sub="GEOGRAPHIC SPREAD"  delay={0.25} />
      </div>

      {/* ── Section 2+3: Severity Matrix + Geographic Heatmap ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Severity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-panel p-10 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-white/50" />
              <h3 className="mono text-xs font-black uppercase tracking-[0.2em] text-white/80 m-0">Severity Propulsion Matrix</h3>
            </div>
            {events.length > 0 && sevBreak.critical / events.length > 0.1 && (
              <span className="mono text-[8px] font-black text-danger border border-danger/30 bg-danger/10 px-2 py-1 rounded animate-pulse">DANGER ZONE</span>
            )}
          </div>
          <div className="flex flex-col gap-6">
            {[
              { label: 'Critical', key: 'critical', bar: 'bg-danger shadow-[0_0_12px_rgba(255,179,173,0.4)]',  text: 'text-danger'      },
              { label: 'High',     key: 'high',     bar: 'bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.3)]', text: 'text-orange-400' },
              { label: 'Medium',   key: 'medium',   bar: 'bg-warning shadow-[0_0_12px_rgba(255,185,95,0.3)]',  text: 'text-warning'     },
              { label: 'Low',      key: 'low',      bar: 'bg-success shadow-[0_0_12px_rgba(223,237,26,0.2)]',  text: 'text-success'     },
            ].map(({ label, key, bar, text }) => {
              const count = sevBreak[key] || 0;
              const pct = events.length > 0 ? (count / events.length) * 100 : 0;
              return (
                <div key={key} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-[11px] font-black uppercase tracking-widest ${text}`}>{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="mono text-[10px] text-white/20">{pct.toFixed(1)}%</span>
                      <span className={`mono text-sm font-black ${text}`}>{count.toString().padStart(2,'0')}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5, ease: [0.22,1,0.36,1] }}
                      className={`h-full rounded-full ${bar}`} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 flex justify-between">
            <span className="mono text-[9px] text-white/20 font-black uppercase tracking-widest">Total Analyzed</span>
            <span className="mono text-xl font-black text-white">{events.length.toString().padStart(3,'0')}</span>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-[0.02]"><ShieldAlert size={200} /></div>
        </motion.div>

        {/* Geographic Heatmap */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-panel p-10 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-white/50" />
              <h3 className="mono text-xs font-black uppercase tracking-[0.2em] text-white/80 m-0">Geographic Exposure Map</h3>
            </div>
            <span className="mono text-[9px] text-white/30 font-black">{geoBreak.length} REGIONS</span>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-2">
            {geoBreak.map(({ loc, count, sev }, i) => (
              <div key={loc} className="flex flex-col gap-1 group">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="mono text-[8px] text-white/20 font-black w-5">{(i+1).toString().padStart(2,'0')}</span>
                    <span className="text-[11px] font-black text-white/60 uppercase tracking-tight group-hover:text-white transition-colors">{loc}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`mono text-[8px] font-black uppercase ${GEO_TEXT_COLOR[sev] || 'text-white/30'}`}>{sev}</span>
                    <span className="mono text-xs font-black text-white/50">{count.toString().padStart(2,'0')}</span>
                  </div>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(count/maxGeo)*100}%` }}
                    transition={{ duration: 1.2, delay: i*0.03, ease: [0.22,1,0.36,1] }}
                    className={`h-full rounded-full ${GEO_BAR_COLOR[sev] || 'bg-white/20'}`} />
                </div>
              </div>
            ))}
            {!geoBreak.length && <div className="py-12 text-center opacity-20 mono text-[10px] uppercase">No Geographic Data</div>}
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-[0.02]"><Globe size={200} /></div>
        </motion.div>
      </div>

      {/* ── Section 4: Type×Risk Matrix + Confidence Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Type × Severity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-panel p-10 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <Layers size={18} className="text-white/50" />
            <h3 className="mono text-xs font-black uppercase tracking-[0.2em] text-white/80 m-0">Event Vector × Severity Matrix</h3>
          </div>
          <div className="grid grid-cols-[1fr_36px_36px_36px_36px] gap-2 px-2 mb-3">
            <span className="mono text-[8px] font-black text-white/20 uppercase">Event Type</span>
            <span className="mono text-[8px] font-black text-danger text-center">C</span>
            <span className="mono text-[8px] font-black text-orange-400 text-center">H</span>
            <span className="mono text-[8px] font-black text-warning text-center">M</span>
            <span className="mono text-[8px] font-black text-success text-center">L</span>
          </div>
          {typeMatrix.map(([type, c], i) => (
            <motion.div key={type} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i*0.04 }}
              className="grid grid-cols-[1fr_36px_36px_36px_36px] gap-2 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
              <span className="text-[11px] font-black text-white/50 uppercase tracking-tight group-hover:text-white truncate capitalize">{type.replace(/_/g,' ')}</span>
              <span className={`mono text-[11px] font-black text-center ${c.critical>0?'text-danger':'text-white/10'}`}>{c.critical||'—'}</span>
              <span className={`mono text-[11px] font-black text-center ${c.high>0?'text-orange-400':'text-white/10'}`}>{c.high||'—'}</span>
              <span className={`mono text-[11px] font-black text-center ${c.medium>0?'text-warning':'text-white/10'}`}>{c.medium||'—'}</span>
              <span className={`mono text-[11px] font-black text-center ${c.low>0?'text-success':'text-white/10'}`}>{c.low||'—'}</span>
            </motion.div>
          ))}
          <div className="mt-6 pt-4 border-t border-white/5">
            <span className="mono text-[8px] text-white/20 font-black uppercase tracking-widest">C=Critical  H=High  M=Medium  L=Low</span>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-[0.02]"><Layers size={200} /></div>
        </motion.div>

        {/* Confidence Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="glass-panel p-10 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <Cpu size={18} className="text-white/50" />
            <h3 className="mono text-xs font-black uppercase tracking-[0.2em] text-white/80 m-0">AI Confidence Distribution</h3>
          </div>
          <div className="flex flex-col gap-6">
            {confBands.map(({ label, count, color, text }) => {
              const pct = events.length > 0 ? (count/events.length)*100 : 0;
              return (
                <div key={label} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className={`mono text-[11px] font-black ${text}`}>{label}</span>
                      <span className="mono text-[8px] text-white/20">confidence band</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="mono text-[10px] text-white/20">{pct.toFixed(1)}%</span>
                      <span className={`mono text-sm font-black ${text}`}>{count.toString().padStart(2,'0')}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5, ease: [0.22,1,0.36,1] }}
                      className={`h-full rounded-full ${color}`} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 flex justify-between">
            <span className="mono text-[9px] text-white/20 font-black uppercase">High confidence ≥ 90% model certainty</span>
            <span className={`mono text-[11px] font-black ${avgConf>=80?'text-success':'text-warning'}`}>{avgConf}% avg</span>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-[0.02]"><Cpu size={200} /></div>
        </motion.div>
      </div>

      {/* ── Section 5: Threat Timeline ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="glass-panel p-10 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-white/50" />
            <div>
              <h3 className="mono text-xs font-black uppercase tracking-[0.2em] text-white/80 m-0">Threat Exposure Timeline</h3>
              <p className="mono text-[8px] text-white/20 font-black uppercase m-0 mt-1">Real detection velocity — last {timeline.length} active windows</p>
            </div>
          </div>
          {timeline.length > 0 && <span className="mono text-[9px] text-white/30 font-black">Peak: {maxTL} events/day</span>}
        </div>
        {timeline.length > 0 ? (
          <>
            <div className="flex items-end gap-1.5 h-28 mb-3">
              {timeline.map(({ label, count, date }) => {
                const h = (count / maxTL) * 100;
                const isSpike = count >= maxTL * 0.75;
                return (
                  <div key={date} className="flex-1 flex flex-col items-center group relative h-full">
                    <div className="w-full flex items-end h-full">
                      <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 1.2, ease: [0.22,1,0.36,1] }}
                        className={`w-full rounded-t-sm transition-colors ${isSpike ? 'bg-danger/50 shadow-[0_0_10px_rgba(255,179,173,0.2)]' : 'bg-white/10 group-hover:bg-white/20'}`}>
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          <span className="mono text-[9px] font-black text-white">{count}</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              {timeline.map(({ label, date }) => (
                <div key={date} className="flex-1 text-center">
                  <span className="mono text-[7px] font-black text-white/20 uppercase">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-6">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-danger/50" /><span className="mono text-[8px] text-white/20 uppercase font-black">High-velocity spike</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-white/10" /><span className="mono text-[8px] text-white/20 uppercase font-black">Normal activity</span></div>
            </div>
          </>
        ) : (
          <div className="py-14 text-center opacity-20 mono text-[10px] uppercase tracking-widest">No Timeline Data Available</div>
        )}
        <div className="absolute -right-10 -bottom-10 opacity-[0.02]"><TrendingUp size={200} /></div>
      </motion.div>

      {/* ── Section 6: Decision Intelligence Panel ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}
        className={`glass-panel rounded-2xl border ${rStyle.border} relative overflow-hidden`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${rStyle.pipe}`} />

        {/* Panel Header */}
        <div className="p-10 pb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${rStyle.border} ${rStyle.bg}`}>
              <Target size={24} className={rStyle.color} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter m-0">Decision Intelligence</h3>
              <span className="mono text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">AI-synthesized from {events.length} active events · {avgConf}% model confidence</span>
            </div>
          </div>
          <div className={`flex items-center gap-4 px-6 py-3 rounded-xl border ${rStyle.border} ${rStyle.bg}`}>
            <div className="flex flex-col items-end">
              <span className="mono text-[9px] text-white/30 uppercase font-black">Risk Level</span>
              <span className={`text-xl font-black tracking-tighter ${rStyle.color}`}>{decision.level}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="mono text-[9px] text-white/30 uppercase font-black">Primary Vector</span>
              <span className="text-sm font-black tracking-tight text-white capitalize">{decision.threat}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="mono text-[9px] text-white/30 uppercase font-black">Hotspot</span>
              <span className="text-sm font-black tracking-tight text-white">{decision.hotspot}</span>
            </div>
          </div>
        </div>

        {/* Context strip */}
        <div className={`mx-10 mb-8 px-6 py-4 rounded-xl ${rStyle.bg} border ${rStyle.border}`}>
          <p className="text-sm text-white/60 m-0 leading-relaxed">
            <span className={`font-black uppercase ${rStyle.color}`}>{decision.level} EXPOSURE DETECTED.</span>{' '}
            {events.length} active disruption scenarios across {geoBreak.length} geographic regions, with {sevBreak.critical} critical and {sevBreak.high} high-severity events requiring strategic attention.
            The "{decision.threat}" event class is the dominant disruption vector, with {decision.hotspot} representing {decision.hPct}% of all active exposure.
          </p>
        </div>

        {/* Recommended Actions */}
        <div className="px-10 pb-10 flex flex-col gap-4">
          <span className="mono text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Recommended Actions</span>
          {decision.actions.map(({ type, title, text }, i) => {
            const s = ACTION_STYLES[type] || ACTION_STYLES.strategic;
            const { Icon } = s;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + i*0.1 }}
                className={`flex gap-5 p-6 rounded-xl border ${s.border} ${s.bg} relative overflow-hidden group`}>
                <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${s.dot}`} />
                <div className={`p-2 rounded-lg border ${s.border} ${s.bg} shrink-0 h-fit`}>
                  <Icon size={16} className={s.color} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className={`mono text-[9px] font-black uppercase tracking-widest ${s.color}`}>{type}</span>
                    <h4 className="text-sm font-black text-white tracking-tight m-0">{title}</h4>
                  </div>
                  <p className="text-[12px] text-white/50 m-0 leading-relaxed group-hover:text-white/70 transition-colors">{text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Footer */}
      <div className="pt-8 border-t border-white/5 flex justify-between items-center opacity-20">
        <span className="mono text-[8px] font-black uppercase tracking-[0.5em]">System Stability::99.99%</span>
        <div className="flex gap-2">{[1,2,3,4,5].map(i=><div key={i} className="w-1 h-1 rounded-full bg-white/20"/>)}</div>
        <span className="mono text-[8px] font-black uppercase tracking-[0.5em]">Session::0x82A1LK</span>
      </div>

      <ImpactSimulationView event={selectedEvent} simulationData={simulationData} impactData={impactData} onClose={() => setSelectedEvent(null)} />
    </div>
  );
};

export default RiskAnalyticsPage;
