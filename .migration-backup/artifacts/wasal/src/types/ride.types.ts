export interface Driver {
  id: string;
  user_id: string;
  license_number?: string;
  license_expiry?: string;
  years_experience?: number;
  bio?: string;
  is_approved: boolean;
  approval_date?: string;
  rejection_reason?: string;
  total_trips: number;
  rating: number;
  total_earnings: number;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  vehicle_type: 'car' | 'motorcycle' | 'tuktuk';
  brand: string;
  model: string;
  year?: number;
  color?: string;
  plate_number: string;
  insurance_number?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: 'license_front' | 'license_back' | 'id_front' | 'id_back' | 'vehicle_ownership' | 'insurance' | 'profile_photo';
  document_url: string;
  is_verified: boolean;
  verified_at?: string;
  uploaded_at: string;
}

export type RideRequestStatus = 'pending' | 'driver_assigned' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';
export type NegotiationStatus = 'pending' | 'offered' | 'accepted' | 'rejected' | 'negotiating' | 'cancelled';

export interface RideRequest {
  id: string;
  customer_id: string;
  from_city: string;
  to_city: string;
  from_address?: string;
  to_address?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  ride_type?: string;
  passenger_count?: number;
  waiting_time?: number;
  proposed_price?: number;
  final_price?: number;
  customer_accepted: boolean;
  negotiation_status: NegotiationStatus;
  status: RideRequestStatus;
  driver_id?: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  cancellation_reason?: string;
  payment_method?: string;
  payment_status?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Ride {
  id: string;
  request_id: string;
  driver_id: string;
  customer_id: string;
  pickup_location?: string;
  dropoff_location?: string;
  price: number;
  platform_commission: number;
  driver_earning: number;
  status: 'assigned' | 'arrived' | 'started' | 'completed' | 'cancelled';
  started_at?: string;
  ended_at?: string;
  distance_km?: number;
  rating_by_customer?: number;
  rating_by_driver?: number;
  created_at: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  is_online: boolean;
  updated_at: string;
}
