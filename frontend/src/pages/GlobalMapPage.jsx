import React, { useState } from 'react';
import GlobalRiskMap from '../components/Map/GlobalRiskMap';
import EventFeed from '../components/Events/EventFeed';
import { useIntelligenceData, useEventSimulation } from '../hooks/useData';
import ImpactSimulationView from '../components/Simulation/ImpactSimulationView';

const GlobalMapPage = () => {
  const { events, loading } = useIntelligenceData();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { simulationData, impactData } = useEventSimulation(selectedEvent?.id);

  const filteredEvents = selectedLocation
    ? events.filter(e => e.location === selectedLocation)
    : events;

  const handleEventSelect = (evt) => {
    if (!evt) {
      setSelectedLocation(null);
      setSelectedEvent(null);
      return;
    }
    setSelectedLocation(evt.location);
    setSelectedEvent(evt);
  };

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* Page Header */}
      <div className="flex justify-between items-end px-8 md:px-10 pt-8 pb-6">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-white mb-1">Detected Disruptions</h2>
          <p className="text-slate-500 text-sm m-0">
            Live geospatial view of all active supply chain disruptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold tracking-widest text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 rounded-sm mono">
            {events.length} LIVE EVENTS
          </span>
        </div>
      </div>

      {/* Full-Screen Map */}
      <div className="mx-8 md:mx-10 h-[calc(100vh-320px)] min-h-[500px] rounded-sm overflow-hidden ring-1 ring-white/5">
        <GlobalRiskMap
          events={events}
          onLocationSelect={handleEventSelect}
          selectedLocation={selectedLocation}
        />
      </div>

      {/* Full Event Feed Below */}
      <div className="px-8 md:px-10 pt-8 pb-10">
        <EventFeed
          events={filteredEvents}
          onEventSelect={(evt) => {
            if (selectedEvent?.id === evt.id) setSelectedEvent(null);
            else setSelectedEvent(evt);
          }}
          selectedEventId={selectedEvent?.id}
        />
      </div>

      <ImpactSimulationView
        event={selectedEvent}
        simulationData={simulationData}
        impactData={impactData}
        onClose={() => {
          setSelectedEvent(null);
          setSelectedLocation(null);
        }}
      />
    </div>
  );
};

export default GlobalMapPage;
