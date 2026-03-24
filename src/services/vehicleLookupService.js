// Vehicle lookup service - fetches vehicle details from registration number
// Proxied through the backend server to avoid CORS issues with DVLA API

const SERVER_URL = 'http://localhost:3001';

function getToken() {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token || null;
  } catch { return null; }
}

/**
 * Look up vehicle details by registration number using DVLA + MOT APIs
 * @param {string} registration - UK vehicle registration number
 * @returns {Promise<Object>} Vehicle details
 */
export async function lookupVehicle(registration) {
  const cleanReg = registration.replace(/\s+/g, '').toUpperCase();

  if (!cleanReg || cleanReg.length < 2) {
    throw new Error('Invalid registration number');
  }

  // Fetch DVLA data and MOT data in parallel (both via backend proxy)
  const [dvlaData, motData] = await Promise.all([
    fetchDVLA(cleanReg),
    fetchMOT(cleanReg),
  ]);

  return {
    make: dvlaData.make || '',
    model: '', // DVLA does not return model
    year: dvlaData.yearOfManufacture || new Date().getFullYear(),
    color: capitalise(dvlaData.colour || ''),
    fuelType: capitalise(dvlaData.fuelType || ''),
    engineSize: dvlaData.engineCapacity ? `${dvlaData.engineCapacity}` : '',
    co2Emissions: dvlaData.co2Emissions || null,
    taxStatus: dvlaData.taxStatus || '',
    taxDueDate: dvlaData.taxDueDate || '',
    motStatus: dvlaData.motStatus || '',
    motExpiry: dvlaData.motExpiryDate || motData?.motExpiry || '',
    motHistory: motData?.history || [],
    monthOfFirstRegistration: dvlaData.monthOfFirstRegistration || '',
  };
}

/**
 * Fetch vehicle data from DVLA via backend proxy
 */
async function fetchDVLA(registration) {
  const token = getToken();
  const response = await fetch(`${SERVER_URL}/api/vehicle-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ registration }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Vehicle not found. Check the registration number.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `DVLA lookup failed (${response.status})`);
  }

  return response.json();
}

/**
 * Fetch MOT history via backend proxy (handles OAuth2 internally)
 */
async function fetchMOT(registration) {
  try {
    const token = getToken();
    const response = await fetch(`${SERVER_URL}/api/mot-lookup?registration=${encodeURIComponent(registration)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.warn('MOT API lookup failed:', error.message);
    return null;
  }
}

/**
 * Capitalise first letter of each word, lowercase the rest
 * e.g. "BLUE" -> "Blue", "DIESEL" -> "Diesel"
 */
function capitalise(str) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}
