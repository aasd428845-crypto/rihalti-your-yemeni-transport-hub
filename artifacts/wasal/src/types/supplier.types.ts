export interface Region {
  id: number;
  name_ar: string;
  type: string;
  parent_id: number | null;
  is_active: boolean | null;
}

export interface TripType {
  id: number;
  name_ar: string;
  slug: string;
}

export interface SupplierTrip {
  id: string;
  supplier_id: string;
  type_id: number | null;
  from_city: string;
  to_city: string;
  from_region_id: number | null;
  to_region_id: number | null;
  departure_time: string;
  period: "morning" | "evening" | null;
  price: number;
  available_seats: number;
  bus_company: string | null;
  bus_number: string | null;
  amenities: string[];
  notes: string | null;
  is_offer: boolean;
  offer_type: "percentage" | "fixed" | null;
  offer_value: number | null;
  offer_until: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  customer_id: string;
  seat_count: number;
  total_amount: number;
  payment_method: string | null;
  payment_status: string;
  status: string;
  created_at: string;
  customer_name?: string;
  trip_info?: string;
}

export interface ShipmentRequest {
  id: string;
  customer_id: string;
  supplier_id: string;
  shipment_type: "door_to_door" | "office_to_office";
  pickup_address: string | null;
  delivery_address: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  item_description: string | null;
  item_weight: number | null;
  item_dimensions: string | null;
  images: string[];
  status: string;
  admin_approved: boolean;
  supplier_priced: boolean;
  price: number | null;
  payment_method: string | null;
  barcode: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
}

export interface SupplierTransaction {
  id: string;
  supplier_id: string;
  type: "platform_payout" | "external_income" | "external_expense" | "adjustment";
  amount: number;
  description: string | null;
  reference_id: string | null;
  category: string | null;
  date: string;
  created_at: string;
}

export const shipmentStatusLabels: Record<string, string> = {
  pending_approval: "بانتظار موافقة المشرف",
  pending_pricing: "بانتظار التسعير",
  priced: "تم التسعير",
  accepted: "مقبول",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

export const shipmentStatusColors: Record<string, string> = {
  pending_approval: "bg-yellow-100 text-yellow-800",
  pending_pricing: "bg-orange-100 text-orange-800",
  priced: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export const bookingStatusLabels: Record<string, string> = {
  pending_approval: "بانتظار الموافقة",
  confirmed: "مؤكد",
  cancelled: "ملغي",
  completed: "مكتمل",
};

export const transactionTypeLabels: Record<string, string> = {
  platform_payout: "دفعة من المنصة",
  external_income: "إيراد خارجي",
  external_expense: "مصروف خارجي",
  adjustment: "تعديل",
};

export const amenitiesList = [
  { id: "ac", label: "تكييف" },
  { id: "wifi", label: "واي فاي" },
  { id: "screen", label: "شاشات" },
  { id: "usb", label: "شواحن USB" },
  { id: "water", label: "مياه" },
  { id: "snacks", label: "وجبات خفيفة" },
  { id: "bathroom", label: "دورة مياه" },
  { id: "legroom", label: "مساحة أرجل واسعة" },
];
