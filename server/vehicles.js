// Vehicle routes — all data stored in Supabase, shared by web + mobile

const SUPABASE_URL = 'https://bwwfrdwpcxzlvprswzne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo';

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// Map DB row → frontend vehicle shape
function toVehicle(row) {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    year: row.year,
    color: row.color,
    licensePlate: row.license_plate,
    status: row.status,
    currentDriver: row.current_driver,
    currentDriverId: row.current_driver_id,
    destination: row.destination,
    dailyMileage: row.daily_mileage,
    heading: row.heading,
    speed: row.speed,
    lastGpsUpdate: row.last_gps_update,
    trackerId: row.tracker_id,
    imageId: row.image_id,
    capacity: row.capacity,
    fuelType: row.fuel_type,
    transmission: row.transmission,
    seatingLayout: row.seating_layout,
    position: row.position,
    route: row.route,
    insurance: row.insurance,
    tax: row.tax,
    maintenance: row.maintenance,
    mot: row.mot,
    fuel: row.fuel,
    keeper: row.keeper,
    purchase: row.purchase,
    tfl: row.tfl,
    parking: row.parking,
    mvl: row.mvl,
    documents: row.documents,
    updatedAt: row.updated_at,
  };
}

// Map frontend vehicle shape → DB columns
function toRow(v) {
  const row = {};
  if (v.make !== undefined) row.make = v.make;
  if (v.model !== undefined) row.model = v.model;
  if (v.year !== undefined) row.year = v.year;
  if (v.color !== undefined) row.color = v.color;
  if (v.licensePlate !== undefined) row.license_plate = v.licensePlate;
  if (v.status !== undefined) row.status = v.status;
  if (v.currentDriver !== undefined) row.current_driver = v.currentDriver;
  if (v.currentDriverId !== undefined) row.current_driver_id = v.currentDriverId;
  if (v.destination !== undefined) row.destination = v.destination;
  if (v.dailyMileage !== undefined) row.daily_mileage = v.dailyMileage;
  if (v.heading !== undefined) row.heading = v.heading;
  if (v.speed !== undefined) row.speed = v.speed;
  if (v.lastGpsUpdate !== undefined) row.last_gps_update = v.lastGpsUpdate;
  if (v.trackerId !== undefined) row.tracker_id = v.trackerId;
  if (v.imageId !== undefined) row.image_id = v.imageId;
  if (v.capacity !== undefined) row.capacity = v.capacity;
  if (v.fuelType !== undefined) row.fuel_type = v.fuelType;
  if (v.transmission !== undefined) row.transmission = v.transmission;
  if (v.seatingLayout !== undefined) row.seating_layout = v.seatingLayout;
  if (v.position !== undefined) row.position = v.position;
  if (v.route !== undefined) row.route = v.route;
  if (v.insurance !== undefined) row.insurance = v.insurance;
  if (v.tax !== undefined) row.tax = v.tax;
  if (v.maintenance !== undefined) row.maintenance = v.maintenance;
  if (v.mot !== undefined) row.mot = v.mot;
  if (v.fuel !== undefined) row.fuel = v.fuel;
  if (v.keeper !== undefined) row.keeper = v.keeper;
  if (v.purchase !== undefined) row.purchase = v.purchase;
  if (v.tfl !== undefined) row.tfl = v.tfl;
  if (v.parking !== undefined) row.parking = v.parking;
  if (v.mvl !== undefined) row.mvl = v.mvl;
  if (v.documents !== undefined) row.documents = v.documents;
  return row;
}

export function registerVehicleRoutes(app, requireAuth, requireRole) {
  // Allow PATCH in CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    next();
  });

  // GET /api/vehicles — list all
  app.get('/api/vehicles', requireAuth, async (req, res) => {
    try {
      const rows = await sb('/rest/v1/vehicles?order=make.asc,model.asc&select=*');
      res.json((rows || []).map(toVehicle));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/vehicles/:id — single vehicle
  app.get('/api/vehicles/:id', requireAuth, async (req, res) => {
    try {
      const rows = await sb(`/rest/v1/vehicles?id=eq.${req.params.id}&select=*`);
      if (!rows?.length) return res.status(404).json({ error: 'Not found' });
      res.json(toVehicle(rows[0]));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/vehicles — create
  app.post('/api/vehicles', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { id, ...rest } = req.body;
      const row = { id: id || `v-${Date.now()}`, ...toRow(rest) };
      const result = await sb('/rest/v1/vehicles', {
        method: 'POST',
        body: JSON.stringify(row),
      });
      res.status(201).json(toVehicle(Array.isArray(result) ? result[0] : result));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/vehicles/:id — update (partial)
  app.patch('/api/vehicles/:id', requireAuth, async (req, res) => {
    try {
      const row = toRow(req.body);
      if (!Object.keys(row).length) return res.status(400).json({ error: 'No fields to update' });
      const result = await sb(`/rest/v1/vehicles?id=eq.${req.params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(row),
      });
      res.json(Array.isArray(result) ? result[0] : result || { ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/vehicles/:id — admin only
  app.delete('/api/vehicles/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await sb(`/rest/v1/vehicles?id=eq.${req.params.id}`, { method: 'DELETE' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/car-images — list all car images
  app.get('/api/car-images', requireAuth, async (req, res) => {
    try {
      const rows = await sb('/rest/v1/car_images?select=*&order=id.asc');
      res.json(rows || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/car-images — add image entry
  app.post('/api/car-images', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const result = await sb('/rest/v1/car_images', {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.status(201).json(Array.isArray(result) ? result[0] : result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}
