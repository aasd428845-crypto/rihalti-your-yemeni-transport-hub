export type ServiceRequestType = 'shipment' | 'delivery' | 'taxi';
export type ServiceRequestStatus =
  | 'pending_price'
  | 'price_sent'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer';

export interface ServiceRequest {
  id: string;
  request_number: string;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  customer_id: string;
  customer_display_id: string;
  partner_id?: string;
  partner_type?: string;
  from_city: string;
  to_city: string;
  from_address?: string;
  to_address?: string;
  description?: string;
  quantity: number;
  notes?: string;
  receiver_name?: string;
  receiver_phone_masked?: string;
  receiver_phone?: string;
  proposed_price?: number;
  agreed_price?: number;
  platform_commission_rate: number;
  platform_commission?: number;
  partner_net?: number;
  payment_method?: PaymentMethod;
  payment_status: string;
  whatsapp_shared: boolean;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  completed_at?: string;
}

export interface RequestMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_role: 'customer' | 'partner' | 'admin';
  message: string;
  is_blocked: boolean;
  block_reason?: string;
  read_at?: string;
  created_at: string;
}
