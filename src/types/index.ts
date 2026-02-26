import { Timestamp } from 'firebase/firestore';

// User roles
export type UserRole = 'passenger' | 'conductor' | 'admin';

// User profile stored in Firestore
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Bus document
export interface Bus {
  id: string;
  busNumber: string;
  routeId: string;
  conductorId?: string;
  capacity: number;
  passengerCount: number;
  status: 'idle' | 'active' | 'maintenance' | 'starting' | 'ended' | 'started';
  hazard?: boolean;
  hazardReason?: string;
  hazardOtherReason?: string;
  scheduledTime?: string;
  scheduledDate?: string;
  location?: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number; // km/h
    updatedAt: Timestamp;
  };
  currentStopIndex?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Notification document
export interface AppNotification {
  id: string;
  type: 'overspeed' | 'hazard' | 'trip_completed' | 'incident';
  busId: string;
  speed?: number;
  message?: string;
  hazardReason?: string;
  hazardOtherReason?: string;
  isRead: boolean;
  status?: 'pending' | 'resolved';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Route document
export interface Route {
  id: string;
  name: string;
  description?: string;
  stops: string[]; // Array of stop IDs
  fare: number;
  estimatedDuration: number; // in minutes
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Stop document
export interface Stop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  routeIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Ticket document
export interface Ticket {
  id: string;
  userId: string;
  busId: string;
  routeId: string;
  boardingStop: string;
  destinationStop: string;
  ticketCount: number;
  fare: number;
  status: 'PENDING' | 'CONFIRMED' | 'BOARDED' | 'EXITED' | 'CANCELLED' | 'EXPIRED';
  paymentMethod: 'online' | 'cash';
  qrCode?: string;
  boardedAt?: Timestamp;
  exitedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Trip document (for conductor trip history)
export interface Trip {
  id: string;
  busId: string;
  conductorId: string;
  routeId: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  totalPassengers: number;
  totalRevenue: number;
  status: 'active' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Revenue tracking
export interface DailyRevenue {
  id: string;
  date: string; // YYYY-MM-DD format
  totalTickets: number;
  onlineRevenue: number;
  cashRevenue: number;
  totalRevenue: number;
  byRoute: Record<string, { tickets: number; revenue: number }>;
}

// Crowd level helper
export type CrowdLevel = 'low' | 'medium' | 'high';

export function getCrowdLevel(passengerCount: number, capacity: number): CrowdLevel {
  const ratio = passengerCount / capacity;
  if (ratio < 0.5) return 'low';
  if (ratio < 0.8) return 'medium';
  return 'high';
}

export function getCrowdLevelColor(level: CrowdLevel): string {
  switch (level) {
    case 'low': return 'text-success';
    case 'medium': return 'text-warning';
    case 'high': return 'text-destructive';
  }
}

export function getCrowdLevelBg(level: CrowdLevel): string {
  switch (level) {
    case 'low': return 'bg-success/15 text-success';
    case 'medium': return 'bg-warning/15 text-warning';
    case 'high': return 'bg-destructive/15 text-destructive';
  }
}
