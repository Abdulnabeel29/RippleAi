import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import GlobalRiskMap from '../components/Map/GlobalRiskMap';
import PredictionsPanel from '../components/Predictions/PredictionsPanel';
import EventFeed from '../components/Events/EventFeed';
import TopInsightBanner from '../components/TopInsightBanner';
import ImpactSimulationView from '../components/Simulation/ImpactSimulationView';
import { useIntelligenceData, useEventSimulation } from '../hooks/useData';

const DashboardPage = () => {
    const { events, predictions, loading } = useIntelligenceData();
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const { simulationData, impactData } = useEventSimulation(selectedEvent?.id);

    const handleLocationSelect = (loc) => {
        setSelectedLocation(loc);
    };

    const handleEventSelect = (evt) => {
        if (selectedEvent?.id === evt.id) setSelectedEvent(null);
        else setSelectedEvent(evt);
    };

    // Slice data for "Dashboard Preview" versions - High Density
    const recentEvents = events.slice(0, 10);
    const topPredictions = predictions.slice(0, 8);

    return (
        <div className="flex flex-col gap-12 p-8 md:p-10 max-w-7xl mx-auto">
            
            {/* Top Intelligence Banner */}
            <TopInsightBanner predictions={predictions} />

            {/* 1. Global Risk Map Section */}
            <section className="flex flex-col gap-5">
                <div className="flex justify-between items-end px-1">
                    <div>
                        <h3 className="mono text-[10px] uppercase tracking-widest text-slate-500 m-0">Geospatial Intelligence Vector</h3>
                        <h2 className="text-2xl font-bold text-white mt-1">Live Risk Map</h2>
                    </div>
                </div>
                <div className="h-[550px] rounded-sm overflow-hidden ring-1 ring-white/5 shadow-2xl relative group">
                    <GlobalRiskMap 
                        events={events} 
                        onLocationSelect={handleLocationSelect} 
                        selectedLocation={selectedLocation} 
                    />
                    {/* Floating redirect button for Map */}
                    <div className="absolute top-4 right-4 z-20">
                        <Link to="/map" className="bg-[#151c25]/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm text-[11px] font-bold text-white uppercase tracking-widest hover:bg-primary hover:text-black transition-all shadow-xl flex items-center gap-2 group">
                            <span className="material-symbols-outlined text-sm">fullscreen</span>
                            Fullscreen Map
                        </Link>
                    </div>
                </div>
            </section>

            {/* 2. AI Forecasting Section */}
            <section className="flex flex-col gap-5">
                <div className="flex justify-between items-center px-1">
                    <div>
                        <h3 className="mono text-[10px] uppercase tracking-widest text-slate-500 m-0">Predictive Intelligence</h3>
                        <h2 className="text-xl font-bold text-white mt-1">AI Disruption Forecasts</h2>
                    </div>
                </div>
                <div className="bg-[#151c25]/30 rounded-sm ring-1 ring-white/5 p-1 flex flex-col items-center">
                    <div className="w-full">
                        <PredictionsPanel predictions={topPredictions} />
                    </div>
                    {/* Explicit redirect button at bottom */}
                    <Link to="/analytics" className="mt-8 mb-6 px-10 py-3 bg-white/5 border border-white/10 text-white font-bold text-[11px] uppercase tracking-[0.2em] rounded-sm hover:bg-white hover:text-black hover:border-white transition-all active:scale-95 flex items-center gap-2 group shadow-lg">
                        View All Predictive Analytics
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                </div>
            </section>

            {/* 3. Recent Disruptions Section */}
            <section className="flex flex-col gap-5">
                <div className="flex justify-between items-center px-1">
                    <div>
                        <h3 className="mono text-[10px] uppercase tracking-widest text-slate-500 m-0">Real-time Event Feed</h3>
                        <h2 className="text-xl font-bold text-white mt-1">Detected Disruptions</h2>
                    </div>
                </div>
                <div className="bg-[#151c25]/30 rounded-sm ring-1 ring-white/5 p-1 flex flex-col items-center">
                    <div className="w-full">
                        <EventFeed 
                            events={recentEvents} 
                            onEventSelect={handleEventSelect}
                            selectedEventId={selectedEvent?.id}
                        />
                    </div>
                    {/* Explicit redirect button at bottom */}
                    <Link to="/map" className="mt-8 mb-6 px-10 py-3 bg-white/5 border border-white/10 text-white font-bold text-[11px] uppercase tracking-[0.2em] rounded-sm hover:bg-white hover:text-black hover:border-white transition-all active:scale-95 flex items-center gap-2 group shadow-lg">
                        Explore All Logged Events
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">list</span>
                    </Link>
                </div>
            </section>

            {/* Global Impact Simulation (Popup) */}
            <ImpactSimulationView 
                event={selectedEvent} 
                simulationData={simulationData} 
                impactData={impactData} 
                onClose={() => setSelectedEvent(null)}
            />
        </div>
    );
};

export default DashboardPage;
