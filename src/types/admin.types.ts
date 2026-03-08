export type AppRole = "customer" | "supplier" | "delivery_company" | "admin" | "driver" | "delivery_driver";

export interface UserWithRole {
  user_id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  is_blocked?: boolean;
}

export interface Trip {
  id: string;
  supplier_id: string;
  from_city: string;
  to_city: string;
  departure_time: string;
  price: number;
  available_seats: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  customer_id: string;
  supplier_id: string | null;
  pickup_location: string;
  delivery_location: string;
  weight: number | null;
  description: string | null;
  status: string;
  payment_method: string;
  amount: number;
  created_at: string;
}

export interface Delivery {
  id: string;
  customer_id: string;
  delivery_partner_id: string | null;
  restaurant_name: string | null;
  items: any;
  delivery_address: string;
  status: string;
  payment_method: string;
  amount: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  partner_id: string | null;
  type: string;
  reference_id: string | null;
  amount: number;
  platform_fee: number;
  partner_earning: number;
  payment_method: string;
  status: string;
  created_at: string;
  refunded_at: string | null;
}

export interface Payout {
  id: string;
  partner_id: string;
  partner_role: string;
  amount: number;
  bank_account_details: any;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export interface CancellationRequest {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  reason: string | null;
  status: string;
  refund_amount: number;
  refund_status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  data: any;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  admin_id: string | null;
  subject: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  last_message?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
}

export const roleLabels: Record<string, string> = {
  customer: "عميل",
  supplier: "مورد",
  delivery_company: "شركة توصيل",
  driver: "سائق أجرة",
  delivery_driver: "مندوب توصيل",
  admin: "مشرف",
};

export const statusLabels: Record<string, string> = {
  pending: "معلق",
  approved: "مقبول",
  rejected: "مرفوض",
  cancelled: "ملغي",
  completed: "مكتمل",
  open: "مفتوح",
  closed: "مغلق",
  paid: "مدفوع",
  refunded: "مسترد",
  processed: "تمت المعالجة",
};

export const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  processed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export const entityTypeLabels: Record<string, string> = {
  trip: "رحلة",
  shipment: "شحنة",
  delivery: "توصيل",
  supplier_registration: "تسجيل مورد",
  delivery_registration: "تسجيل شركة توصيل",
  booking: "حجز",
  pending_trip: "رحلة معلقة",
  pending_shipment: "طلب شحن معلق",
  pending_delivery: "طلب توصيل معلق",
};
