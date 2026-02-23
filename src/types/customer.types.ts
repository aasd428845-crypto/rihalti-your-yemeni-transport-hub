export interface CustomerAddress {
  id: string;
  customer_id: string;
  address_name: string;
  full_address: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
}

export interface TripSearchParams {
  from_city?: string;
  to_city?: string;
  date?: string;
}

export interface TripWithSupplier {
  id: string;
  supplier_id: string;
  from_city: string;
  to_city: string;
  departure_time: string;
  period: string | null;
  price: number;
  available_seats: number;
  status: string;
  is_offer: boolean | null;
  offer_type: string | null;
  offer_value: number | null;
  offer_until: string | null;
  bus_company: string | null;
  bus_number: string | null;
  amenities: any;
  notes: string | null;
  created_at: string;
  from_region_id: number | null;
  to_region_id: number | null;
  type_id: number | null;
  supplier_name?: string;
}

export interface BookingFormData {
  trip_id: string;
  seat_count: number;
  payment_method: string;
  total_amount: number;
}

export interface ShipmentFormData {
  supplier_id: string;
  shipment_type: string;
  pickup_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  recipient_name: string;
  recipient_phone: string;
  item_description: string;
  item_weight?: number;
  item_dimensions?: string;
  payment_method: string;
}

export interface DeliveryFormData {
  delivery_company_id: string;
  restaurant_id?: string;
  order_type: string;
  items: { name: string; quantity: number; price: number }[];
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  payment_method: string;
  delivery_fee: number;
  notes?: string;
}
