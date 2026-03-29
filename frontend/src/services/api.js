import { supabase } from './supabase';

const BASE_URL = '/api';

export const fetchEvents = async () => {
  // Direct read from Supabase for maximum speed
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('detected_at', { ascending: false });
  
  if (error) {
    console.error('Supabase fetch error:', error);
    // Fallback to backend API
    const response = await fetch(`${BASE_URL}/events`);
    if (!response.ok) throw new Error('Failed to fetch events');
    const result = await response.json();
    return result.data?.events || result.events || result.data || [];
  }
  
  return data || [];
};

export const fetchEventImpact = async (eventId) => {
  const response = await fetch(`${BASE_URL}/events/${eventId}/impact`);
  if (!response.ok) throw new Error('Failed to fetch event impact');
  const result = await response.json();
  return result.data || result;
};

export const fetchEventSimulation = async (eventId) => {
  const response = await fetch(`${BASE_URL}/events/${eventId}/simulation`);
  if (!response.ok) throw new Error('Failed to fetch event simulation');
  const result = await response.json();
  return result.data || result;
};

export const fetchEventDecision = async (eventId) => {
  // First attempt: Direct read from Supabase 'strategic_brief' column
  if (eventId) {
    const { data, error } = await supabase
      .from('events')
      .select('strategic_brief')
      .eq('id', eventId)
      .single();
    
    if (!error && data?.strategic_brief) {
      try {
        return JSON.parse(data.strategic_brief);
      } catch (e) {
        console.error('Failed to parse strategic_brief from Supabase:', e);
      }
    }
  }

  // Second attempt: Prediction table cache if primary event record is missing brief
  const response = await fetch(`${BASE_URL}/events/${eventId}/decision`);
  if (!response.ok) throw new Error('Failed to fetch decision intelligence');
  const result = await response.json();
  return result.data?.intelligence || result.intelligence || result.data;
};

export const fetchPredictions = async () => {
  // Direct read from Supabase for maximum speed
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .order('probability', { ascending: false });
  
  if (error) {
    console.error('Supabase fetch predictions error:', error);
    // Fallback
    const response = await fetch(`${BASE_URL}/predictions`);
    if (!response.ok) throw new Error('Failed to fetch predictions');
    const result = await response.json();
    return result.predictions || result.data?.predictions || result.data || [];
  }
  
  // Transform to match frontend schema
  return (data || []).map(p => ({
    ...p,
    why: p.why || "Analyzing risk factors...",
    how: p.how || "Modeling operational impact...",
    is_synthesized: !!(p.why && p.how)
  }));
};

export const enrichSimulationNode = async (eventId, node) => {
  const response = await fetch(`${BASE_URL}/events/${eventId}/simulate/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target: node.target,
      depth: node.depth,
      facility_type: node.facility_type
    })
  });
  if (!response.ok) throw new Error('Enrichment failed');
  const result = await response.json();
  return result.data;
};
export const enrichPrediction = async (prediction) => {
  const response = await fetch(`${BASE_URL}/predictions/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: prediction.event_type,
      location: prediction.location,
      risk_level: prediction.risk_level
    })
  });
  if (!response.ok) throw new Error('Prediction enrichment failed');
  const result = await response.json();
  return result;
};

export const fetchPredictionBrief = async (prediction) => {
  const params = new URLSearchParams({
    event_type: prediction.event_type,
    location: prediction.location,
    risk_level: prediction.risk_level
  });
  const response = await fetch(`${BASE_URL}/predictions/brief?${params}`);
  if (!response.ok) throw new Error('Failed to fetch prediction brief');
  const result = await response.json();
  return result;
};
