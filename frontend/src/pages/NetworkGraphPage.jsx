import React, { useState, useEffect, useMemo } from 'react';
import { useIntelligenceData } from '../hooks/useData';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, MapPin, Clock, CheckSquare, Users,
  TrendingUp, TrendingDown, ArrowRight, Zap, Shield,
  Ship, GitBranch, Cpu, Activity
} from 'lucide-react';

// ─── RECOMMENDED ACTIONS ─────────────────────────────────────────────────────
const getRecommendedActions = (event) => {
  if (!event) return [];
  const type = (event.event_type || '').toLowerCase();
  const sev  = (event.severity || '').toLowerCase();
  const actions = [];
  const urgency = sev === 'critical' ? 'Immediate' : sev === 'high' ? 'Within 24h' : 'Within 72h';

  if (type.includes('port') || type.includes('maritime')) {
    actions.push({ label: 'Reroute in-transit shipments via air freight for time-critical cargo', urgency, icon: Ship });
    actions.push({ label: 'Alert procurement teams to activate secondary suppliers outside affected region', urgency: 'Within 48h', icon: Users });
  }
  if (type.includes('weather') || type.includes('storm') || type.includes('flood')) {
    actions.push({ label: 'Pre-position buffer inventory in unaffected distribution hubs', urgency, icon: Shield });
    actions.push({ label: 'Notify downstream partners of anticipated lead time extension', urgency: 'Within 24h', icon: Users });
  }
  if (type.includes('strike') || type.includes('labor')) {
    actions.push({ label: 'Activate contract workforce agreements at affected facilities', urgency, icon: Users });
    actions.push({ label: 'Assess automation capacity to partially offset output loss', urgency: 'Within 48h', icon: Cpu });
  }
  if (type.includes('cyber') || type.includes('hack')) {
    actions.push({ label: 'Switch to offline logistics management fallback systems now', urgency, icon: Shield });
    actions.push({ label: 'Engage third-party logistics (3PL) partners for operational continuity', urgency, icon: GitBranch });
  }
  if (actions.length === 0) {
    actions.push({ label: 'Activate Tier-2 suppliers in geographies outside the affected area', urgency, icon: GitBranch });
    actions.push({ label: 'Communicate extended lead times to customers to prevent escalation', urgency: 'Within 24h', icon: Users });
  }
  if (sev === 'critical' || sev === 'high') {
    actions.push({ label: 'Escalate to executive risk committee for emergency review', urgency: 'Immediate', icon: AlertTriangle });
  }
  return actions.slice(0, 4);
};

// ─── IMPACT TIMELINE ─────────────────────────────────────────────────────────
const getImpactTimeline = (event) => {
  if (!event) return [];
  const sev = (event.severity || '').toLowerCase();
  const isCritical = sev === 'critical' || sev === 'high';
  return [
    { label: 'Disruption detected',          time: 'Now',                              status: 'done'    },
    { label: 'First-tier suppliers impacted', time: isCritical ? '6–12 hours' : '1–2 days', status: 'active'  },
    { label: 'Production delays begin',       time: isCritical ? '24–48 hours' : '3–5 days', status: 'pending' },
    { label: 'End-consumer shortages possible', time: isCritical ? '5–10 days' : '2–4 weeks', status: 'pending' },
  ];
};

// ─── IMPACT DATA HOOK ─────────────────────────────────────────────────────────
const useImpactData = (eventId) => {
  const [impact, setImpact]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) { setImpact(null); return; }
    setLoading(true);
    fetch(`/api/events/${eventId}/impact`)
      .then(r => r.json())
      .then(data => { if (data.status === 'success') setImpact(data.data.impact); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  return { impact, loading };
};

// ─── CASCADE IMPACT TIMELINE ─────────────────────────────────────────────────
// A Gantt-style breakdown of exactly what breaks and when.
// Answers: "How severe is this and how will it unfold over time?"
const CascadeTimeline = ({ event, impact, isHigh, isMed }) => {
  const [hoveredId, setHoveredId] = useState(null);

  const confidence = event?.confidence_score ?? 0.5;
  const epicColor  = isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#3b82f6';

  // Timeline window & stagger offsets driven by severity
  const maxDays = isHigh ? 21  : isMed ? 35  : 60;
  const t1Start = isHigh ? 1.5 : isMed ? 3   : 6;
  const t2Start = isHigh ? 5   : isMed ? 10  : 18;
  const ticks   = isHigh ? [0, 3, 7, 14, 21]
                : isMed  ? [0, 7, 14, 21, 35]
                :           [0, 7, 14, 28, 60];
  const fmt = (d) => d === 0 ? 'NOW' : `+${d}d`;

  const industries = (impact?.industries || []).slice(0, 5);
  const companies  = (impact?.companies  || []).slice(0, 6);
  const hasData    = industries.length > 0;

  // Build ordered cascade rows: epicenter → T1 industries → T2 companies
  const rows = [
    {
      id:    'epi',
      label: (event?.event_type || 'DISRUPTION').replace(/_/g, ' '),
      sub:   event?.location?.split(',')[0] || '',
      tier:  0,
      start: 0,
      dur:   maxDays,
      color: epicColor,
      bg:    isHigh ? '#ef444420' : isMed ? '#f59e0b20' : '#3b82f620',
      badge: event?.severity?.toUpperCase() || 'ACTIVE',
      pct:   Math.round(confidence * 100),
    },
    ...industries.map((name, i) => ({
      id:    `i${i}`,
      label: name,
      sub:   'Industry sector',
      tier:  1,
      start: t1Start + i * 0.3,
      dur:   maxDays - t1Start - i * 0.3,
      color: '#3b82f6',
      bg:    'rgba(59,130,246,0.08)',
      badge: 'T1 · INDUSTRY',
      pct:   Math.round(confidence * 82),
    })),
    ...companies.map((name, i) => ({
      id:    `c${i}`,
      label: name,
      sub:   'Downstream entity',
      tier:  2,
      start: t2Start + i * 0.4,
      dur:   maxDays - t2Start - i * 0.4,
      color: '#64748b',
      bg:    'rgba(100,116,139,0.07)',
      badge: 'T2 · COMPANY',
      pct:   Math.round(confidence * 48),
    })),
  ];

  const isDimmed = (id) => hoveredId !== null && hoveredId !== id;

  return (
    <div className="w-full h-full flex flex-col px-6 py-5 overflow-hidden select-none">

      {/* Header */}
      <div className="flex items-start justify-between mb-5 shrink-0">
        <div>
          <p className="mono text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">
            Impact Cascade Timeline
          </p>
          <h3 className="text-sm font-black text-white tracking-tight m-0 leading-tight">
            {event ? (event.event_type || '').replace(/_/g, ' ') : 'Select a disruption'}
          </h3>
          {event && (
            <p className="text-[9px] text-white/35 mt-0.5 m-0">{event.location}</p>
          )}
        </div>
        {event && (
          <div className="flex items-center gap-2 shrink-0">
            <span className={`mono text-[8px] font-black px-2 py-1 rounded border
              ${isHigh ? 'text-danger border-danger/30 bg-danger/10'
              : isMed  ? 'text-warning border-warning/30 bg-warning/10'
              :          'text-primary border-primary/30 bg-primary/10'}`}>
              {event.severity?.toUpperCase()}
            </span>
            <span className="mono text-[8px] text-white/30 font-black border border-white/8 px-2 py-1 rounded">
              {Math.round(confidence * 100)}% CONF
            </span>
          </div>
        )}
      </div>

      {!hasData && !event ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="mono text-[10px] text-white/15 uppercase tracking-widest text-center leading-loose">
            Select a disruption on the left<br/>to view its cascade timeline
          </p>
        </div>
      ) : (
        <>
          {/* Time axis header — spacer aligns with bar area */}
          <div className="flex items-end mb-2 shrink-0">
            <div className="w-[185px] shrink-0" />
            <div className="flex-1 relative h-6">
              {ticks.map(day => (
                <div key={day} className="absolute flex flex-col items-center"
                  style={{ left: `${(day / maxDays) * 100}%`, transform: 'translateX(-50%)' }}>
                  <span className="mono text-[7.5px] font-black text-white/25">{fmt(day)}</span>
                  <div className="w-px h-2 bg-white/10 mt-0.5" />
                </div>
              ))}
            </div>
            <div className="w-10 shrink-0" />
          </div>

          {/* Cascade rows */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            {rows.map((row, idx) => {
              const startPct = (row.start / maxDays) * 100;
              const widthPct = Math.max(1, (row.dur / maxDays) * 100);
              const dim      = isDimmed(row.id);

              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: dim ? 0.18 : 1, x: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.04 }}
                  className="flex items-center h-10 cursor-default"
                  onMouseEnter={() => setHoveredId(row.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Label column */}
                  <div className="w-[185px] shrink-0 pr-3 flex items-center gap-2"
                    style={{ paddingLeft: 8 + row.tier * 14 }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-white/80 m-0 truncate leading-tight">
                        {row.label.slice(0, 18)}
                      </p>
                      <span className="mono text-[7px] font-black leading-none"
                        style={{ color: row.color, opacity: 0.6 }}>
                        {row.badge}
                      </span>
                    </div>
                  </div>

                  {/* Timeline bar */}
                  <div className="flex-1 relative h-8 flex items-center">
                    {/* Tick gridlines */}
                    {ticks.map(day => (
                      <div key={day} className="absolute top-0 bottom-0 w-px bg-white/[0.04]"
                        style={{ left: `${(day / maxDays) * 100}%` }} />
                    ))}

                    {/* The bar itself */}
                    <motion.div
                      className="absolute h-6 rounded-sm"
                      style={{
                        left:       `${startPct}%`,
                        width:      `${widthPct}%`,
                        background: `linear-gradient(to right, ${row.color}28, ${row.color}08)`,
                        borderLeft: `2px solid ${row.color}`,
                      }}
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.55, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="px-2 h-full flex items-center">
                        <span className="mono text-[7px] font-black text-white/22 whitespace-nowrap">
                          {row.pct}% · {row.tier === 0 ? 'NOW' : fmt(Math.round(row.start))}
                        </span>
                      </div>
                    </motion.div>

                    {/* Start dot */}
                    <div
                      className="absolute w-3 h-3 rounded-full border-2 bg-[#05080f] z-10"
                      style={{
                        left:        `${startPct}%`,
                        top:         '50%',
                        transform:   'translate(-50%, -50%)',
                        borderColor: row.color,
                        boxShadow:   hoveredId === row.id ? `0 0 8px ${row.color}` : 'none',
                      }}
                    />
                  </div>

                  {/* Right impact badge */}
                  <div className="w-10 shrink-0 text-right">
                    <span className="mono text-[9px] font-black"
                      style={{ color: row.color, opacity: 0.8 }}>
                      {row.pct}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Summary strip */}
          <div className="shrink-0 mt-3 pt-3 border-t border-white/5 flex items-center gap-8">
            {[
              { label: 'Affected entities', value: `${rows.length - 1}` },
              { label: 'Industries hit',    value: `${industries.length}` },
              { label: 'First impact',      value: fmt(Math.round(t1Start)) },
              { label: 'Cascade window',    value: fmt(maxDays) },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="mono text-[7px] text-white/20 uppercase tracking-widest font-black">{label}</span>
                <span className="text-sm font-black text-white leading-none">{value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const NetworkGraphPage = () => {
  const { events, predictions, loading } = useIntelligenceData();
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage]             = useState(0);
  const PAGE_SIZE = 10;

  const { impact, loading: graphLoading } = useImpactData(selectedId);
  const selected = useMemo(() => events.find(e => e.id === selectedId), [events, selectedId]);

  // Auto-select highest-severity event and jump to its page
  useEffect(() => {
    if (!selectedId && events.length > 0) {
      const top    = events.find(e => ['high', 'critical'].includes(e.severity?.toLowerCase())) || events[0];
      const topIdx = events.findIndex(e => e.id === top.id);
      setSelectedId(top.id);
      if (topIdx >= 0) setPage(Math.floor(topIdx / PAGE_SIZE));
    }
  }, [events, selectedId]);

  // Linked predictions
  const linkedPreds = useMemo(() => {
    if (!selected) return [];
    return predictions.filter(p =>
      p.location?.toLowerCase().includes((selected.location || '').toLowerCase().split(',')[0]) ||
      p.event_type === selected.event_type
    ).sort((a, b) => b.probability - a.probability).slice(0, 3);
  }, [selected, predictions]);

  const actions  = useMemo(() => getRecommendedActions(selected), [selected]);
  const timeline = useMemo(() => getImpactTimeline(selected),     [selected]);

  const isHigh = ['high', 'critical'].includes(selected?.severity?.toLowerCase());
  const isMed  = selected?.severity?.toLowerCase() === 'medium';
  const accentColor = isHigh ? 'text-danger'  : isMed ? 'text-warning'  : 'text-primary';
  const accentBg    = isHigh ? 'bg-danger/10 border-danger/20'  : isMed ? 'bg-warning/10 border-warning/20'  : 'bg-primary/10 border-primary/20';
  const accentPipe  = isHigh ? 'status-pipe-red' : isMed ? 'status-pipe-amber' : 'status-pipe-blue';

  const critCount = events.filter(e => ['high', 'critical'].includes(e.severity?.toLowerCase())).length;
  const topPred   = predictions.filter(p => p.probability > 0.6).sort((a, b) => b.probability - a.probability).slice(0, 3);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#05080f]">

      {/* ══ LEFT PANEL ═══════════════════════════════════════════════════════════ */}
      <div className="w-[300px] shrink-0 flex flex-col border-r border-white/5 bg-[#05080f] overflow-hidden">

        <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01] shrink-0">
          <p className="text-[10px] mono font-black uppercase tracking-[0.3em] text-white/25 mb-1">Supply Chain Intelligence</p>
          <h2 className="text-base font-black text-white tracking-tight m-0">Active Disruptions</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[9px] text-white/40 mono">{events.length} total</span>
            {critCount > 0 && (
              <span className="text-[9px] font-black text-danger mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse inline-block" />
                {critCount} critical
              </span>
            )}
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1.5">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-white/[0.02] animate-pulse" />
            ))
          ) : events.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((evt, idx) => {
            const active  = selectedId === evt.id;
            const hi      = ['high', 'critical'].includes(evt.severity?.toLowerCase());
            const med     = evt.severity?.toLowerCase() === 'medium';
            const confPct = Math.round((evt.confidence_score || 0.5) * 100);
            const rising  = confPct > 70;
            return (
              <motion.button
                key={evt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => setSelectedId(evt.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 relative overflow-hidden
                  ${active
                    ? 'bg-white/[0.06] border-white/15'
                    : 'bg-transparent border-white/[0.04] hover:bg-white/[0.03] hover:border-white/10'}`}
              >
                {active && <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${hi ? 'status-pipe-red' : med ? 'status-pipe-amber' : 'status-pipe-blue'}`} />}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black mono uppercase
                    ${hi ? 'text-danger' : med ? 'text-warning' : 'text-primary'}`}>
                    {hi ? '● CRITICAL' : med ? '● MEDIUM' : '● LOW'}
                  </span>
                  <span className={`text-[8px] font-black mono flex items-center gap-0.5
                    ${rising ? 'text-danger/70' : 'text-success/70'}`}>
                    {rising ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {confPct}%
                  </span>
                </div>
                <p className="text-[11px] font-black text-white m-0 leading-tight truncate">
                  {evt.event_type?.replace(/_/g, ' ')}
                </p>
                <p className="text-[9px] text-white/35 m-0 mt-1 flex items-center gap-1 truncate">
                  <MapPin size={8} className="shrink-0" />
                  {evt.location}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Pagination */}
        {events.length > PAGE_SIZE && (
          <div className="shrink-0 border-t border-white/5 px-4 py-2.5 flex items-center justify-between gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-[9px] mono font-black uppercase tracking-widest border border-white/10 text-white/40
                hover:bg-white/[0.04] hover:text-white/70 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
              ← Prev
            </button>
            <div className="flex flex-col items-center">
              <span className="mono text-[9px] font-black text-white/50">{page + 1} / {Math.ceil(events.length / PAGE_SIZE)}</span>
              <span className="mono text-[7px] text-white/20 uppercase tracking-widest">
                {page * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE + PAGE_SIZE, events.length)} of {events.length}
              </span>
            </div>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(events.length / PAGE_SIZE) - 1, p + 1))}
              disabled={page >= Math.ceil(events.length / PAGE_SIZE) - 1}
              className="px-3 py-1.5 rounded-lg text-[9px] mono font-black uppercase tracking-widest border border-white/10 text-white/40
                hover:bg-white/[0.04] hover:text-white/70 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
              Next →
            </button>
          </div>
        )}

        {/* Risks to Watch */}
        {topPred.length > 0 && (
          <div className="border-t border-white/5 p-4 shrink-0">
            <p className="mono text-[8px] font-black uppercase tracking-[0.25em] text-white/20 mb-3 flex items-center gap-1.5">
              <TrendingUp size={9} className="text-warning" /> Risks to Watch
            </p>
            <div className="space-y-2">
              {topPred.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-warning/60 shrink-0" />
                  <span className="text-[9px] text-white/40 truncate flex-1">{p.event_type?.replace(/_/g, ' ')}</span>
                  <span className="mono text-[9px] font-black text-warning/70 shrink-0">{Math.round(p.probability * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ CENTER: CASCADE TIMELINE ═════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#05080f] border-r border-white/5">
        <AnimatePresence>
          {graphLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-[#05080f]/90 backdrop-blur-sm z-20 gap-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="mono text-[9px] text-primary uppercase tracking-widest font-black">Loading cascade data…</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-hidden">
          <CascadeTimeline event={selected} impact={impact} isHigh={isHigh} isMed={isMed} />
        </div>

        <div className="shrink-0 border-t border-white/5 px-6 py-2.5 flex items-center justify-between bg-white/[0.01]">
          <span className="mono text-[8px] text-white/20 uppercase tracking-widest font-black">
            {(impact?.industries?.length || 0) + (impact?.companies?.length || 0)} affected entities
          </span>
          {selected && (
            <span className="mono text-[8px] text-white/30 uppercase tracking-widest font-black">
              Epicenter: <span className="text-white/60">{selected.location?.split(',')[0]}</span>
            </span>
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL: DECISION ════════════════════════════════════════════════ */}
      <div className="w-[360px] shrink-0 border-l border-white/5 h-full overflow-y-auto no-scrollbar bg-[#05080f]">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selectedId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col">

              {/* Situation Summary */}
              <div className="relative px-6 py-5 border-b border-white/5 shrink-0">
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${accentPipe}`} />
                <p className="mono text-[8px] font-black uppercase tracking-[0.3em] text-white/25 mb-2">What is happening</p>
                <h3 className="text-base font-black text-white leading-tight m-0 mb-2">
                  {selected.event_type?.replace(/_/g, ' ')}
                </h3>
                <p className="text-[11px] text-white/50 leading-relaxed m-0">
                  {selected.summary || `A ${selected.severity?.toLowerCase()} severity disruption has been detected in ${selected.location}. This event is affecting supply chain operations in the region.`}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className={`text-[8px] px-2 py-1 rounded font-black mono uppercase border ${accentBg}`}>
                    {selected.severity} Severity
                  </span>
                  <span className="text-[9px] text-white/30 mono flex items-center gap-1.5">
                    <MapPin size={9} />{selected.location}
                  </span>
                </div>
              </div>

              {/* Impact Timeline */}
              <div className="px-6 py-4 border-b border-white/5">
                <p className="mono text-[8px] font-black uppercase tracking-[0.3em] text-white/25 mb-4 flex items-center gap-2">
                  <Clock size={10} className="text-white/30" /> What happens next
                </p>
                <div className="relative">
                  <div className="absolute left-2.5 top-3 bottom-3 w-px bg-white/5" />
                  <div className="space-y-4">
                    {timeline.map((step, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 z-10
                          ${step.status === 'done'    ? 'bg-success/20 border-success/40'
                          : step.status === 'active' ? accentBg
                          : 'bg-white/[0.02] border-white/10'}`}>
                          {step.status === 'done'    && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
                          {step.status === 'active'  && <div className={`w-1.5 h-1.5 rounded-full ${accentColor.replace('text-', 'bg-')} animate-pulse`} />}
                          {step.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-white/10" />}
                        </div>
                        <div className="pb-1">
                          <p className={`text-[10px] font-bold m-0 leading-tight ${step.status === 'pending' ? 'text-white/30' : 'text-white/80'}`}>
                            {step.label}
                          </p>
                          <p className={`text-[9px] mono mt-0.5 m-0 font-black ${step.status === 'active' ? accentColor : 'text-white/20'}`}>
                            {step.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="px-6 py-4 border-b border-white/5">
                <p className="mono text-[8px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 flex items-center gap-2">
                  <CheckSquare size={10} className="text-success" /> What to do now
                </p>
                <div className="space-y-2.5">
                  {actions.map((action, i) => {
                    const Icon   = action.icon;
                    const urgent = action.urgency === 'Immediate';
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all
                          ${urgent ? 'bg-danger/[0.04] border-danger/15' : 'bg-white/[0.02] border-white/5'}`}>
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${urgent ? 'bg-danger/10' : 'bg-white/5'}`}>
                          <Icon size={11} className={urgent ? 'text-danger' : 'text-white/40'} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-white/80 m-0 leading-snug">{action.label}</p>
                          <span className={`text-[8px] mono font-black mt-1 inline-block ${urgent ? 'text-danger/60' : 'text-white/20'}`}>
                            {action.urgency}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Affected Entities */}
              <div className="px-6 py-4 border-b border-white/5">
                <p className="mono text-[8px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 flex items-center gap-2">
                  <Users size={10} className="text-white/30" /> Who is affected
                </p>
                {!impact ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-6 rounded-lg bg-white/[0.02] animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(impact.industries || []).slice(0, 3).map((ind, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className="text-[10px] font-bold text-white/70">{ind}</span>
                        <span className="ml-auto text-[8px] mono text-white/20">Industry</span>
                      </div>
                    ))}
                    {(impact.companies || []).slice(0, 4).map((co, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 ml-3">
                        <ArrowRight size={8} className="text-white/20 shrink-0" />
                        <span className="text-[9px] text-white/40 truncate">{co}</span>
                      </div>
                    ))}
                    {!impact.industries?.length && !impact.companies?.length && (
                      <p className="text-[9px] text-white/20 mono text-center py-3">No entity data available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Linked Forecasts */}
              {linkedPreds.length > 0 && (
                <div className="px-6 py-4">
                  <p className="mono text-[8px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 flex items-center gap-2">
                    <Activity size={10} className="text-warning/60" /> Related risk forecasts
                  </p>
                  <div className="space-y-2">
                    {linkedPreds.map((pred, i) => {
                      const pct = Math.round(pred.probability * 100);
                      return (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[9px] font-bold text-white/60 truncate">{pred.event_type?.replace(/_/g, ' ')}</span>
                            <span className={`mono text-[9px] font-black ${pct >= 80 ? 'text-danger' : 'text-warning'}`}>{pct}% likely</span>
                          </div>
                          <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 80 ? 'bg-danger/60' : 'bg-warning/60'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center h-full">
              <Zap size={32} className="text-white/10" />
              <p className="text-[9px] mono font-black text-white/20 uppercase tracking-[0.3em]">
                Select a disruption to see decision guidance
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default NetworkGraphPage;
