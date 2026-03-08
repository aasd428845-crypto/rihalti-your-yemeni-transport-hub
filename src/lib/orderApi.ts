import { supabase } from "@/integrations/supabase/client";
import { containsContactInfo } from "@/lib/contactFilter";

export type OrderType = 'shipment' | 'delivery' | 'ride';

// ==================== Order Chat ====================
export const fetchOrderMessages = async (orderId: string) => {
  const { data, error } = await supabase
    .from("order_messages" as any)
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as any[]) || [];
};

export const sendOrderMessage = async (params: {
  orderId: string;
  orderType: OrderType;
  senderId: string;
  senderRole: string;
  message: string;
}) => {
  const isBlocked = containsContactInfo(params.message);

  const { data, error } = await supabase.from("order_messages" as any).insert({
    order_id: params.orderId,
    order_type: params.orderType,
    sender_id: params.senderId,
    sender_role: params.senderRole,
    message: params.message,
    is_blocked: isBlocked,
    block_reason: isBlocked ? 'محتوى تواصل خارجي' : null,
  }).select().single();

  if (error) throw error;

  // Log violation if blocked
  if (isBlocked) {
    try {
      await supabase.from("violation_logs" as any).insert({
        user_id: params.senderId,
        violation_type: 'external_contact',
        severity: 'high',
        details: `محاولة مشاركة معلومات تواصل في محادثة طلب ${params.orderType}: ${params.orderId}`,
        source_type: 'order_chat',
        source_id: params.orderId,
      });
    } catch {}
  }

  return { data, isBlocked };
};

// ==================== Shipment Negotiation ====================
export const submitShipmentPrice = async (requestId: string, price: number, partnerId: string) => {
  const { error } = await supabase.from("shipment_requests").update({
    proposed_price: price,
    negotiation_status: 'offered',
    price_offered_at: new Date().toISOString(),
    status: 'priced',
    supplier_priced: true,
    updated_at: new Date().toISOString(),
  }).eq("id", requestId);

  if (error) throw error;

  // Notify customer
  const { data: req } = await supabase.from("shipment_requests").select("customer_id").eq("id", requestId).single();
  if (req) {
    try {
      await supabase.from("notifications").insert({
        user_id: req.customer_id,
        title: '💰 وصلك عرض سعر',
        body: `تم تحديد سعر طلب الشحن الخاص بك: ${price.toLocaleString()} ريال`,
      });
    } catch {}
  }
};

export const acceptShipmentPrice = async (requestId: string, paymentMethod: string) => {
  const { data: req } = await supabase.from("shipment_requests")
    .select("proposed_price, supplier_id")
    .eq("id", requestId).single();
  if (!req) throw new Error("الطلب غير موجود");

  const barcode = `SH-${Date.now().toString(36).toUpperCase()}`;

  const { error } = await supabase.from("shipment_requests").update({
    final_price: req.proposed_price,
    customer_accepted: true,
    negotiation_status: 'accepted',
    price_accepted_at: new Date().toISOString(),
    customer_phone_hidden: false,
    status: 'accepted',
    payment_method: paymentMethod,
    barcode,
    updated_at: new Date().toISOString(),
  }).eq("id", requestId);

  if (error) throw error;

  // Notify supplier
  if (req.supplier_id) {
    try {
      await supabase.from("notifications").insert({
        user_id: req.supplier_id,
        title: '✅ العميل وافق على السعر!',
        body: 'يمكنك الآن رؤية بيانات التواصل وطباعة الباركود.',
      });
    } catch {}
  }

  // Create financial transaction
  await createTransactionFromOrder(requestId, 'shipment', Number(req.proposed_price), req.supplier_id!);

  return barcode;
};

export const rejectShipmentPrice = async (requestId: string) => {
  const { error } = await supabase.from("shipment_requests").update({
    negotiation_status: 'rejected',
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq("id", requestId);
  if (error) throw error;
};

// ==================== Delivery Negotiation ====================
export const submitDeliveryPrice = async (orderId: string, price: number) => {
  const { error } = await supabase.from("delivery_orders").update({
    proposed_price: price,
    negotiation_status: 'offered',
    price_offered_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", orderId);
  if (error) throw error;

  const { data: order } = await supabase.from("delivery_orders").select("customer_id").eq("id", orderId).single();
  if (order?.customer_id) {
    try {
      await supabase.from("notifications").insert({
        user_id: order.customer_id,
        title: '💰 وصلك عرض سعر توصيل',
        body: `تم تحديد سعر طلب التوصيل: ${price.toLocaleString()} ريال`,
      });
    } catch {}
  }
};

export const acceptDeliveryPrice = async (orderId: string, paymentMethod: string) => {
  const { data: order } = await supabase.from("delivery_orders")
    .select("proposed_price, delivery_company_id")
    .eq("id", orderId).single();
  if (!order) throw new Error("الطلب غير موجود");

  const barcode = `DL-${Date.now().toString(36).toUpperCase()}`;

  const { error } = await supabase.from("delivery_orders").update({
    final_price: order.proposed_price,
    customer_accepted: true,
    negotiation_status: 'accepted',
    price_accepted_at: new Date().toISOString(),
    customer_phone_hidden: false,
    barcode,
    payment_method: paymentMethod,
    updated_at: new Date().toISOString(),
  }).eq("id", orderId);
  if (error) throw error;

  if (order.delivery_company_id) {
    try {
      await supabase.from("notifications").insert({
        user_id: order.delivery_company_id,
        title: '✅ العميل وافق على سعر التوصيل!',
        body: 'يمكنك الآن رؤية بيانات العميل وطباعة الباركود.',
      });
    } catch {}
  }

  await createTransactionFromOrder(orderId, 'delivery', Number(order.proposed_price), order.delivery_company_id);
  return barcode;
};

// ==================== Financial Transaction ====================
const createTransactionFromOrder = async (
  orderId: string, orderType: string, amount: number, partnerId: string
) => {
  // Fetch commission rates
  const { data: acctSettings } = await supabase
    .from("accounting_settings")
    .select("*")
    .eq("id", 1)
    .single();

  let commissionRate = 10;
  if (acctSettings) {
    if (orderType === 'shipment') commissionRate = Number(acctSettings.global_commission_shipment);
    else if (orderType === 'delivery') commissionRate = Number(acctSettings.global_commission_delivery);
    else if (orderType === 'ride') commissionRate = Number(acctSettings.global_commission_ride);
  }

  const commission = Math.floor(amount * commissionRate / 100);
  const partnerEarning = amount - commission;

  try {
    await supabase.from("financial_transactions").insert({
      reference_id: orderId,
      transaction_type: orderType,
      amount,
      platform_commission: commission,
      partner_earning: partnerEarning,
      partner_id: partnerId,
      customer_id: partnerId,
      payment_method: 'cash',
      payment_status: 'pending',
    });
  } catch {}
};

// ==================== WhatsApp Sharing ====================
export const generateWhatsAppMessage = (order: any, orderType: OrderType): string => {
  const lines = [
    '🚚 *مهمة توصيل جديدة*',
    '',
  ];

  if (orderType === 'shipment') {
    lines.push(`📦 الوصف: ${order.item_description || '—'}`);
    lines.push(`📍 من: ${order.pickup_address || '—'}`);
    lines.push(`📍 إلى: ${order.delivery_address || '—'}`);
    lines.push(`👤 المستلم: ${order.recipient_name || '—'}`);
    if (order.item_weight) lines.push(`⚖️ الوزن: ${order.item_weight} كغ`);
  } else if (orderType === 'delivery') {
    lines.push(`📍 العنوان: ${order.customer_address || '—'}`);
    lines.push(`👤 العميل: ${order.customer_name || '—'}`);
  }

  if (order.notes) lines.push(`📝 ملاحظات: ${order.notes}`);
  lines.push(`🔢 رقم الطلب: ${order.id?.slice(0, 8)}`);
  // Note: Price is NOT included
  lines.push('', '⚠️ لا تشارك هذه الرسالة مع أي طرف خارجي');

  return lines.join('\n');
};

export const logWhatsAppShare = async (partnerId: string, orderId: string, orderType: OrderType, driverPhone: string, message: string) => {
  try {
    await supabase.from("whatsapp_logs" as any).insert({
      partner_id: partnerId,
      order_id: orderId,
      order_type: orderType,
      driver_phone: driverPhone,
      message_sent: message,
    });
  } catch {}
};

// ==================== Barcode / Delivery Proof ====================
export const recordDeliveryProof = async (params: {
  orderId: string;
  orderType: OrderType;
  scannedBy: string;
  recipientName?: string;
  notes?: string;
}) => {
  // Check if already scanned
  const { data: existing } = await supabase
    .from("delivery_proof" as any)
    .select("id")
    .eq("order_id", params.orderId)
    .eq("barcode_scanned", true)
    .maybeSingle();

  if (existing) throw new Error("تم مسح هذا الباركود مسبقاً");

  const { error } = await supabase.from("delivery_proof" as any).insert({
    order_id: params.orderId,
    order_type: params.orderType,
    barcode_scanned: true,
    scanned_at: new Date().toISOString(),
    scanned_by: params.scannedBy,
    recipient_name: params.recipientName,
    notes: params.notes,
  });

  if (error) throw error;

  // Update order status to delivered
  if (params.orderType === 'shipment') {
    await supabase.from("shipment_requests").update({ status: 'delivered' }).eq("id", params.orderId);
  } else if (params.orderType === 'delivery') {
    await supabase.from("delivery_orders").update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq("id", params.orderId);
  }
};

// ==================== Fetch Order Details ====================
export const fetchShipmentDetails = async (id: string) => {
  const { data, error } = await supabase.from("shipment_requests").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
};

export const fetchDeliveryOrderDetails = async (id: string) => {
  const { data, error } = await supabase.from("delivery_orders").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
};
