import React, { useState, useMemo } from 'react';
import PredictionsPanel from '../components/Predictions/PredictionsPanel';
import EventFeed from '../components/Events/EventFeed';
import ImpactSimulationView from '../components/Simulation/ImpactSimulationView';
import TopInsightBanner from '../components/TopInsightBanner';
import { useIntelligenceData, useEventSimulation } from '../hooks/useData';

const severityColor = (s) => {
  switch (s?.toLowerCase()) {
    case 'high': case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    default: return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  }
};

const RiskAnalyticsPage = () => {
  const { events, predictions, loading } = useIntelligenceData();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { simulationData, impactData } = useEventSimulation(selectedEvent?.id);

  const handleEventSelect = (evt) => {
    if (selectedEvent?.id === evt.id) setSelectedEvent(null);
    else setSelectedEvent(evt);
  };

  // Severity breakdown
  const severityBreakdown = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    events.forEach(e => {
      const s = e.severity?.toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [events]);

  // Event type breakdown
  const typeBreakdown = useMemo(() => {
    const counts = {};
    events.forEach(e => {
      const t = e.event_type || 'unknown';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [events]);

  return (
    <div className="flex flex-col gap-10 p-8 md:p-10">

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-white mb-1">Risk Analytics</h2>
          <p className="text-slate-500 text-sm m-0">Deep-dive into threat intelligence, predictions, and event classification.</p>
        </div>
      </div>

      {/* Top Insight Banner */}
      <TopInsightBanner predictions={predictions} />

      {/* Severity + Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Severity Breakdown */}
        <div className="bg-[#151c25] border border-white/5 rounded-sm p-6">
          <h3 className="mono text-[10px] uppercase tracking-widest text-slate-500 mb-5 m-0">Severity Distribution</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Critical', key: 'critical', color: 'bg-red-500' },
              { label: 'High', key: 'high', color: 'bg-orange-500' },
              { label: 'Medium', key: 'medium', color: 'bg-amber-400' },
              { label: 'Low', key: 'low', color: 'bg-emerald-400' },
            ].map(({ label, key, color }) => {
              const count = severityBreakdown[key] || 0;
              const pct = events.length > 0 ? (count / events.length) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-16 shrink-0">{label}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="mono text-xs text-slate-400 w-6 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Type Breakdown */}
        <div className="bg-[#151c25] border border-white/5 rounded-sm p-6">
          <h3 className="mono text-[10px] uppercase tracking-widest text-slate-500 mb-5 m-0">Event Type Breakdown</h3>
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="text-slate-500 text-sm">Loading...</div>
            ) : typeBreakdown.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-xs text-slate-300 capitalize">{type.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 bg-blue-400 rounded-full"
                      style={{ width: `${(count / events.length) * 100}%` }}
                    />
                  </div>
                  <span className="mono text-xs text-slate-400 w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Predictions Panel */}
      <PredictionsPanel predictions={predictions} />

      {/* Full Event Feed */}
      <EventFeed
        events={events}
        onEventSelect={handleEventSelect}
        selectedEventId={selectedEvent?.id}
      />

      <ImpactSimulationView
        event={selectedEvent}
        simulationData={simulationData}
        impactData={impactData}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};

export default RiskAnalyticsPage;
