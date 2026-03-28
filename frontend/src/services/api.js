const BASE_URL = '/api';

export const fetchEvents = async () => {
  const response = await fetch(`${BASE_URL}/events`);
  if (!response.ok) throw new Error('Failed to fetch events');
  const result = await response.json();
  return result.data?.events || result.events || result.data || [];
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
  const response = await fetch(`${BASE_URL}/events/${eventId}/decision`);
  if (!response.ok) throw new Error('Failed to fetch decision intelligence');
  const result = await response.json();
  return result.data?.intelligence || result.intelligence || result.data;
};

export const fetchPredictions = async () => {
  const response = await fetch(`${BASE_URL}/predictions`);
  if (!response.ok) throw new Error('Failed to fetch predictions');
  const result = await response.json();
  return result.predictions || result.data?.predictions || result.data || [];
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
