/**
 * Supply Chain Geospatial Utilities
 * Shared coordinate mapping and geographic projection for simulations.
 */

// Comprehensive geocoding for supply chain locations worldwide
export const LOCATION_COORDS = {
  // ── Asia Pacific ──────────────────────────────────────────
  'Taiwan': { lng: 120.96, lat: 23.69 },
  'Taipei': { lng: 121.56, lat: 25.04 },
  'China': { lng: 104.19, lat: 35.86 },
  'Shanghai': { lng: 121.47, lat: 31.23 },
  'Beijing': { lng: 116.40, lat: 39.90 },
  'Shenzhen': { lng: 114.05, lat: 22.54 },
  'Guangzhou': { lng: 113.26, lat: 23.13 },
  'Chongqing': { lng: 106.55, lat: 29.56 },
  'Tianjin': { lng: 117.36, lat: 39.11 },
  'Hong Kong': { lng: 114.17, lat: 22.32 },
  'Japan': { lng: 138.25, lat: 36.20 },
  'Tokyo': { lng: 139.69, lat: 35.68 },
  'Osaka': { lng: 135.50, lat: 34.69 },
  'Yokohama': { lng: 139.64, lat: 35.44 },
  'South Korea': { lng: 127.77, lat: 35.91 },
  'Seoul': { lng: 126.97, lat: 37.56 },
  'Busan': { lng: 129.07, lat: 35.10 },
  'Singapore': { lng: 103.81, lat: 1.35 },
  'Malaysia': { lng: 109.69, lat: 4.21 },
  'Kuala Lumpur': { lng: 101.68, lat: 3.14 },
  'Port Klang': { lng: 101.39, lat: 3.00 },
  'Vietnam': { lng: 108.27, lat: 14.06 },
  'Ho Chi Minh City': { lng: 106.66, lat: 10.82 },
  'Hanoi': { lng: 105.83, lat: 21.02 },
  'Thailand': { lng: 100.99, lat: 15.87 },
  'Bangkok': { lng: 100.52, lat: 13.75 },
  'Laem Chabang': { lng: 100.88, lat: 13.08 },
  'Indonesia': { lng: 113.92, lat: -0.79 },
  'Jakarta': { lng: 106.84, lat: -6.21 },
  'Philippines': { lng: 121.77, lat: 12.88 },
  'Manila': { lng: 120.97, lat: 14.59 },
  'India': { lng: 78.96, lat: 20.59 },
  'Mumbai': { lng: 72.87, lat: 19.07 },
  'Chennai': { lng: 80.27, lat: 13.08 },
  'Delhi': { lng: 77.10, lat: 28.70 },
  'Nhava Sheva': { lng: 72.95, lat: 18.95 },
  'Bangladesh': { lng: 90.35, lat: 23.68 },
  'Chittagong': { lng: 91.83, lat: 22.33 },
  'Pakistan': { lng: 69.34, lat: 30.37 },
  'Karachi': { lng: 67.01, lat: 24.86 },
  'Sri Lanka': { lng: 80.77, lat: 7.87 },
  'Colombo': { lng: 79.86, lat: 6.93 },
  'Australia': { lng: 133.77, lat: -25.27 },
  'Sydney': { lng: 151.20, lat: -33.86 },
  'Melbourne': { lng: 144.96, lat: -37.81 },
  'New Zealand': { lng: 172.36, lat: -40.90 },

  // ── Middle East ────────────────────────────────────────────
  'Suez Canal': { lng: 32.28, lat: 30.58 },
  'Egypt': { lng: 30.80, lat: 26.82 },
  'Saudi Arabia': { lng: 45.07, lat: 23.89 },
  'Jeddah': { lng: 39.19, lat: 21.48 },
  'Dammam': { lng: 50.10, lat: 26.43 },
  'UAE': { lng: 54.37, lat: 24.47 },
  'Dubai': { lng: 55.29, lat: 25.20 },
  'Abu Dhabi': { lng: 54.37, lat: 24.46 },
  'Jebel Ali': { lng: 55.02, lat: 24.98 },
  'Oman': { lng: 57.55, lat: 21.51 },
  'Muscat': { lng: 58.59, lat: 23.61 },
  'Qatar': { lng: 51.18, lat: 25.35 },
  'Doha': { lng: 51.53, lat: 25.29 },
  'Kuwait': { lng: 47.48, lat: 29.31 },
  'Israel': { lng: 34.85, lat: 31.04 },
  'Turkey': { lng: 35.24, lat: 38.96 },
  'Istanbul': { lng: 28.97, lat: 41.01 },
  'Iran': { lng: 53.68, lat: 32.42 },
  'Iraq': { lng: 43.67, lat: 33.22 },
  'Jordan': { lng: 36.23, lat: 30.58 },

  // ── Europe ─────────────────────────────────────────────────
  'Rotterdam': { lng: 4.48, lat: 51.92 },
  'Netherlands': { lng: 5.29, lat: 52.13 },
  'Antwerp': { lng: 4.40, lat: 51.22 },
  'Belgium': { lng: 4.46, lat: 50.50 },
  'Hamburg': { lng: 10.00, lat: 53.55 },
  'Germany': { lng: 10.45, lat: 51.16 },
  'Frankfurt': { lng: 8.68, lat: 50.11 },
  'France': { lng: 2.21, lat: 46.23 },
  'Paris': { lng: 2.35, lat: 48.85 },
  'Marseille': { lng: 5.37, lat: 43.30 },
  'UK': { lng: -3.43, lat: 55.37 },
  'United Kingdom': { lng: -3.43, lat: 55.37 },
  'London': { lng: -0.12, lat: 51.50 },
  'Felixstowe': { lng: 1.34, lat: 51.95 },
  'Italy': { lng: 12.56, lat: 41.87 },
  'Genoa': { lng: 8.93, lat: 44.40 },
  'Spain': { lng: -3.74, lat: 40.46 },
  'Barcelona': { lng: 2.15, lat: 41.39 },
  'Algeciras': { lng: -5.45, lat: 36.13 },
  'Poland': { lng: 19.14, lat: 51.92 },
  'Greece': { lng: 21.82, lat: 39.07 },
  'Piraeus': { lng: 23.65, lat: 37.94 },
  'Russia': { lng: 105.31, lat: 61.52 },
  'Sweden': { lng: 18.64, lat: 60.12 },
  'Norway': { lng: 8.46, lat: 60.47 },
  'Denmark': { lng: 9.50, lat: 56.26 },
  'Switzerland': { lng: 8.22, lat: 46.81 },
  'Ukraine': { lng: 31.16, lat: 48.37 },

  // ── Americas ───────────────────────────────────────────────
  'United States': { lng: -95.71, lat: 37.09 },
  'USA': { lng: -95.71, lat: 37.09 },
  'US': { lng: -95.71, lat: 37.09 },
  'Los Angeles': { lng: -118.24, lat: 34.05 },
  'Long Beach': { lng: -118.19, lat: 33.77 },
  'New York': { lng: -74.00, lat: 40.71 },
  'New York City': { lng: -74.00, lat: 40.71 },
  'Chicago': { lng: -87.63, lat: 41.88 },
  'Houston': { lng: -95.36, lat: 29.76 },
  'Savannah': { lng: -81.09, lat: 32.08 },
  'Seattle': { lng: -122.33, lat: 47.60 },
  'Miami': { lng: -80.19, lat: 25.77 },
  'Detroit': { lng: -83.04, lat: 42.33 },
  'Canada': { lng: -106.34, lat: 56.13 },
  'Vancouver': { lng: -123.11, lat: 49.25 },
  'Toronto': { lng: -79.38, lat: 43.65 },
  'Montreal': { lng: -73.56, lat: 45.50 },
  'Mexico': { lng: -102.55, lat: 23.63 },
  'Mexico City': { lng: -99.13, lat: 19.43 },
  'Manzanillo': { lng: -104.32, lat: 19.05 },
  'Panama Canal': { lng: -79.91, lat: 9.14 },
  'Panama': { lng: -80.78, lat: 8.53 },
  'Brazil': { lng: -51.92, lat: -14.23 },
  'São Paulo': { lng: -46.63, lat: -23.54 },
  'Santos': { lng: -46.33, lat: -23.96 },
  'Rio de Janeiro': { lng: -43.17, lat: -22.90 },
  'Argentina': { lng: -63.61, lat: -38.41 },
  'Buenos Aires': { lng: -58.38, lat: -34.61 },
  'Chile': { lng: -71.54, lat: -35.67 },
  'Colombia': { lng: -74.29, lat: 4.57 },
  'Peru': { lng: -75.01, lat: -9.18 },

  // ── Africa ─────────────────────────────────────────────────
  'South Africa': { lng: 25.08, lat: -29.00 },
  'Durban': { lng: 31.02, lat: -29.88 },
  'Cape Town': { lng: 18.42, lat: -33.92 },
  'Nigeria': { lng: 8.67, lat: 9.08 },
  'Lagos': { lng: 3.39, lat: 6.45 },
  'Kenya': { lng: 37.90, lat: 0.02 },
  'Nairobi': { lng: 36.82, lat: -1.29 },
  'Ethiopia': { lng: 40.49, lat: 9.14 },
  'Morocco': { lng: -7.09, lat: 31.79 },
  'Tangier': { lng: -5.80, lat: 35.77 },
  'Ghana': { lng: -1.02, lat: 7.95 },
  'Tanzania': { lng: 34.88, lat: -6.36 },
  'Mozambique': { lng: 35.52, lat: -18.66 },

  // ── Straits & Chokepoints ──────────────────────────────────
  'Strait of Hormuz': { lng: 56.47, lat: 26.56 },
  'Strait of Malacca': { lng: 102.11, lat: 1.25 },
  'Bab el-Mandeb': { lng: 43.42, lat: 12.58 },
  'Cape of Good Hope': { lng: 18.48, lat: -34.36 },
  'Red Sea': { lng: 38.49, lat: 20.28 },
  'Black Sea': { lng: 34.94, lat: 43.32 },
  'Mediterranean': { lng: 15.27, lat: 35.93 },
  'Mediterranean Sea': { lng: 15.27, lat: 35.93 },
  'Pacific Ocean': { lng: -160.00, lat: 5.00 },
  'Indian Ocean': { lng: 76.00, lat: -10.00 },
  'Atlantic Ocean': { lng: -30.00, lat: 15.00 },

  // ── Regional / Compound strings from DB ───────────────────
  'Asia': { lng: 100.61, lat: 34.04 },
  'Asia, including Singapore': { lng: 103.81, lat: 1.35 },
  'Middle East': { lng: 45.00, lat: 25.00 },
  'Europe': { lng: 15.25, lat: 54.52 },
  'North America': { lng: -100.00, lat: 47.00 },
  'South America': { lng: -60.00, lat: -15.00 },
  'Africa': { lng: 21.09, lat: 7.18 },
  'Southeast Asia': { lng: 108.00, lat: 10.00 },
  'Eastern Europe': { lng: 31.16, lat: 49.00 },
  'Western Europe': { lng: 5.00, lat: 48.00 },

  // ── US Specific Locations ─────────────────────────────────
  'Richland Parish, Louisiana': { lng: -91.77, lat: 32.08 },
  'Louisiana': { lng: -91.96, lat: 31.24 },
  'California': { lng: -119.41, lat: 36.77 },
  'Texas': { lng: -99.90, lat: 31.96 },
  'New Jersey': { lng: -74.40, lat: 40.05 },
  'Port of Los Angeles': { lng: -118.27, lat: 33.73 },
  'Port of Long Beach': { lng: -118.21, lat: 33.75 },
  'Port of New York': { lng: -74.04, lat: 40.66 },
  'Port of Savannah': { lng: -81.09, lat: 32.08 },
  'Port of Savannah (Garden City Terminal)': { lng: -81.09, lat: 32.08 },
  'FedEx Memphis Superhub': { lng: -89.97, lat: 35.04 },
  'UPS Worldport (Louisville)': { lng: -85.73, lat: 38.17 },
  'JFK International Air Cargo Terminal': { lng: -73.78, lat: 40.64 },
  'Port of Houston': { lng: -95.27, lat: 29.75 },
  'Chicago O\'Hare Intermodal Hub': { lng: -87.90, lat: 41.97 },
  'Port of Rotterdam': { lng: 4.43, lat: 51.91 },
  'Port of Antwerp': { lng: 4.41, lat: 51.24 },
  'Hamburg Container Terminal': { lng: 9.93, lat: 53.53 },
  'London Gateway': { lng: 0.46, lat: 51.51 },
  'Jebel Ali Port (Dubai)': { lng: 55.02, lat: 24.98 },
  'King Abdulaziz Port (Dammam)': { lng: 50.17, lat: 26.43 },
  'Suez Canal Container Terminal': { lng: 32.32, lat: 31.22 },
  'Port of Singapore (Jurong)': { lng: 103.73, lat: 1.28 },
  'Shanghai Yangshan Port': { lng: 122.07, lat: 30.63 },
  'Hong Kong Kwai Tsing Terminal': { lng: 114.12, lat: 22.33 },
  'Port of Busan': { lng: 129.04, lat: 35.10 },
  'Shenzhen Yantian Hub': { lng: 114.28, lat: 22.58 },
  'Global': { lng: 10.0, lat: 20.0 },
  'Worldwide': { lng: 10.0, lat: 20.0 },
  'Persian Gulf': { lng: 52.0, lat: 26.5 },
  'South China Sea': { lng: 113.0, lat: 15.0 },
};

// Strings that are too vague to plot accurately
const SKIP_LOCATIONS = new Set([
  'unknown', 'port', 'various', 'multiple', 'n/a', 'tbd', 'none',
]);

/**
 * Resolves a location string to lat/lng coordinates.
 * Returns null for vague or unrecognised locations.
 */
export const resolveCoords = (locationStr) => {
  if (!locationStr) return null;
  const lower = locationStr.toLowerCase().trim();

  if (SKIP_LOCATIONS.has(lower)) return null;
  if (LOCATION_COORDS[locationStr]) return LOCATION_COORDS[locationStr];

  const exactKey = Object.keys(LOCATION_COORDS).find(k => k.toLowerCase() === lower);
  if (exactKey) return LOCATION_COORDS[exactKey];

  const keys = Object.keys(LOCATION_COORDS).sort((a, b) => b.length - a.length);
  const prefixKey = keys.find(k => lower.startsWith(k.toLowerCase()));
  if (prefixKey) return LOCATION_COORDS[prefixKey];

  const containsKey = keys.find(k => k.length > 4 && lower.includes(k.toLowerCase()));
  if (containsKey) return LOCATION_COORDS[containsKey];

  return null;
};

/**
 * Projects a new coordinate from a base point at a given distance and angle.
 * Used for distributing nodes in a simulation circle.
 * @param {Object} base - { lng, lat }
 * @param {number} distanceKm - Distance in Kilometers
 * @param {number} angleDeg - Angle in Degrees (0 = North, 90 = East)
 */
export const projectCoords = (base, distanceKm, angleDeg) => {
  const R = 6371; // Earth's radius in km
  const dByR = distanceKm / R;
  const angleRad = (angleDeg * Math.PI) / 180;
  const lat1 = (base.lat * Math.PI) / 180;
  const lon1 = (base.lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) +
    Math.cos(lat1) * Math.sin(dByR) * Math.cos(angleRad)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(angleRad) * Math.sin(dByR) * Math.cos(lat1),
    Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lon2 * 180) / Math.PI,
  };
};
