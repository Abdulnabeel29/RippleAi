import { useState, useEffect } from 'react';
import * as api from '../services/api';

export const useIntelligenceData = () => {
  const [events, setEvents] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEventsProcess = async () => {
      try {
        setLoadingEvents(true);
        const evts = await api.fetchEvents();
        const validEvts = evts.filter(e => e.location && e.severity);
        setEvents(validEvts);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setError("System offline or unable to reach intelligence engine.");
      } finally {
        setLoadingEvents(false);
      }
    };

    const fetchPredictionsProcess = async () => {
      try {
        setLoadingPredictions(true);
        const preds = await api.fetchPredictions();
        const validPreds = preds.filter(p => p.location && p.probability != null);
        setPredictions(validPreds);
      } catch (err) {
        console.error("Failed to fetch predictions:", err);
      } finally {
        setLoadingPredictions(false);
      }
    };

    fetchEventsProcess();
    fetchPredictionsProcess();

    // In a real app we'd poll or use WebSockets
    const interval = setInterval(() => {
      fetchEventsProcess();
      fetchPredictionsProcess();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { 
    events, 
    predictions, 
    loading: loadingEvents || loadingPredictions,
    loadingEvents,
    loadingPredictions,
    error 
  };
};

export const useEventSimulation = (eventId) => {
  const [simulationData, setSimulationData] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setSimulationData(null);
      setImpactData(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const [sim, imp] = await Promise.all([
          api.fetchEventSimulation(eventId).catch(() => null),
          api.fetchEventImpact(eventId).catch(() => null)
        ]);
        
      let finalSimData = null;
      if (sim && sim.impacts && Array.isArray(sim.impacts)) {
        finalSimData = sim.impacts.map(i => ({
          target: i.entity || i.target,
          depth: i.depth,
          impact: i.impact_score !== undefined ? i.impact_score : i.impact
        }));
      } else if (Array.isArray(sim)) {
        finalSimData = sim;
      }

      // Mock fallback if API not ready or fails
      setSimulationData(finalSimData || mockSimulationData());
      setImpactData(imp || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetail();
  }, [eventId]);

  return { simulationData, impactData, loading };
};

// Mock data generator for visual demonstration when API is incomplete
const mockSimulationData = () => {
  return [
    { target: "Supplier A", depth: 1, impact: 1.0 },
    { target: "Supplier B", depth: 1, impact: 1.0 },
    { target: "Distribution Center X", depth: 2, impact: 0.6 },
    { target: "Distribution Center Y", depth: 2, impact: 0.6 },
    { target: "Retailer Core", depth: 3, impact: 0.36 },
    { target: "End Customer Network", depth: 3, impact: 0.36 }
  ];
};

export const useDecisionIntelligence = (eventId) => {
  const [decisionData, setDecisionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setDecisionData(null);
      return;
    }

    const fetchDecision = async () => {
      try {
        setLoading(true);
        const data = await api.fetchEventDecision(eventId);
        setDecisionData(data);
      } catch (err) {
        console.error(err);
        setDecisionData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDecision();
  }, [eventId]);

  return { decisionData, loading };
};
