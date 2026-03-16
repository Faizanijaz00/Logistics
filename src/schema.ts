// ============================================
// CORE DATA SCHEMAS FOR LOGISTICS HUB
// ============================================

// ---- Location & Coordinates ----
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Route {
  start: Coordinates;
  end: Coordinates;
  waypoints?: Coordinates[];
}

// ---- Vehicle & Fleet ----
export type VehicleStatus = 'active' | 'parked' | 'maintenance' | 'emergency';

export interface VehicleInsurance {
  provider: string;
  policyNumber: string;
  expiryDate: string;
  annualCost: number;
  documentUrl: string;
}

export interface VehicleMaintenance {
  lastService: string;
  nextService: string;
  serviceCost: number;
  tireWear: number; // 0-100 percentage
  oilLife: number;  // 0-100 percentage
}

export interface VehicleTax {
  status: 'paid' | 'due' | 'overdue';
  expiryDate: string;
  annualCost: number;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  status: VehicleStatus;
  currentDriver: string | null;
  destination: string | null;
  dailyMileage: number;
  heading: number; // 0-360 degrees
  position: Coordinates;
  route: Route | null;
  insurance: VehicleInsurance;
  maintenance: VehicleMaintenance;
  tax: VehicleTax;
  parkingPermit: string | null;
}

// ---- Users & Drivers ----
export type UserRole = 'driver' | 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  licenseType: string;
  available: boolean;
  assignedVehicle: string | null;
  avatar?: string;
}

// ---- Parking Zones ----
export type ParkingZoneStatus = 'free' | 'risky' | 'high-risk' | 'private';

export interface ParkingZone {
  id: string;
  name: string;
  status: ParkingZoneStatus;
  color: 'green' | 'yellow' | 'orange' | 'red';
  description: string;
  bounds: [number, number][]; // Polygon coordinates
  capacity: number;
  occupied: number;
  permitRequired: boolean;
  hours: string;
  restrictions?: string;
}

// ---- Ride Requests ----
export type RequestReason = 'shopping' | 'lift' | 'collection' | 'medical' | 'other';
export type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected';

export interface RideRequest {
  id: string;
  requester: string;
  requesterId: string;
  reason: RequestReason;
  description: string;
  pickupLocation: string;
  pickupCoords: Coordinates;
  destination: string;
  destinationCoords: Coordinates;
  requestedDate: string;
  requestedTime: string;
  status: RequestStatus;
  assignedVehicle: string | null;
  assignedDriver: string | null;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

// ---- Emergency System ----
export type EmergencyType = 'police_stop' | 'accident' | 'breakdown' | 'medical' | 'other';

export interface EmergencyAlert {
  id: string;
  type: EmergencyType;
  vehicleId: string;
  driverId: string;
  location: Coordinates;
  timestamp: string;
  message: string;
  isActive: boolean;
  acknowledgedBy: string[];
}

export interface EmergencyDocument {
  id: string;
  vehicleId: string;
  type: 'insurance' | 'registration' | 'permit' | 'license';
  name: string;
  url: string;
  expiryDate: string;
}

// ---- Notifications ----
export type NotificationType = 'emergency' | 'request' | 'maintenance' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  relatedId?: string;
}

// ---- App State Types ----
export interface MapFilters {
  showActiveVehicles: boolean;
  showParkedVehicles: boolean;
  showRoutes: boolean;
  showParkingZones: boolean;
  selectedZoneStatus: ParkingZoneStatus | 'all';
}

export interface AppSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  soundAlerts: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}
