export interface Restaurant {
  id: string;
  delivery_company_id: string;
  name_ar: string;
  name_en?: string;
  logo_url?: string;
  cover_image?: string;
  phone?: string;
  address?: string;
  location_lat?: number;
  location_lng?: number;
  is_active: boolean;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name_ar: string;
  name_en?: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name_ar: string;
  name_en?: string;
  description?: string;
  price: number;
  discounted_price?: number;
  image_url?: string;
  preparation_time?: number;
  is_available: boolean;
  options?: any[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Rider {
  id: string;
  delivery_company_id: string;
  full_name: string;
  phone: string;
  email?: string;
  profile_image?: string;
  vehicle_type: string;
  vehicle_plate?: string;
  id_number?: string;
  is_active: boolean;
  is_online: boolean;
  current_lat?: number;
  current_lng?: number;
  last_location_update?: string;
  total_deliveries: number;
  rating: number;
  earnings: number;
  commission_type: string;
  commission_value: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryOrder {
  id: string;
  delivery_company_id: string;
  restaurant_id?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  order_type: string;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  rider_id?: string;
  assigned_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  notes?: string;
  estimated_delivery_time?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  // joined
  restaurant?: Restaurant;
  rider?: Rider;
}

export interface OrderTracking {
  id: string;
  order_id: string;
  status: string;
  location_lat?: number;
  location_lng?: number;
  note?: string;
  created_at: string;
}

export interface CustomLink {
  id: string;
  delivery_company_id: string;
  merchant_name: string;
  merchant_phone?: string;
  link_token: string;
  is_active: boolean;
  clicks: number;
  expires_at?: string;
  created_at: string;
}

export interface RiderReward {
  id: string;
  delivery_company_id: string;
  rider_id: string;
  type: string;
  amount: number;
  description?: string;
  achieved_at: string;
  rider?: Rider;
}

export interface PartnerJoinRequest {
  id: string;
  delivery_company_id: string;
  business_name: string;
  business_type: string;
  contact_name?: string;
  contact_phone: string;
  contact_email?: string;
  address?: string;
  notes?: string;
  status: string;
  created_at: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled' | 'returned';

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'مقبول', color: 'bg-blue-100 text-blue-800' },
  preparing: { label: 'قيد التحضير', color: 'bg-orange-100 text-orange-800' },
  ready: { label: 'جاهز', color: 'bg-indigo-100 text-indigo-800' },
  assigned: { label: 'تم التعيين', color: 'bg-purple-100 text-purple-800' },
  picked_up: { label: 'تم الاستلام', color: 'bg-cyan-100 text-cyan-800' },
  on_the_way: { label: 'في الطريق', color: 'bg-teal-100 text-teal-800' },
  delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
  returned: { label: 'مرتجع', color: 'bg-gray-100 text-gray-800' },
};
