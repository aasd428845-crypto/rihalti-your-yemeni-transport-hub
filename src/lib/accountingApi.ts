import { supabase } from "@/integrations/supabase/client";

// ==================== Accounting Settings ====================
export const getAccountingSettings = async () => {
  const { data, error } = await supabase
    .from("accounting_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data;
};

export const updateAccountingSettings = async (settings: {
  global_commission_booking?: number;
  global_commission_delivery?: number;
  global_commission_shipment?: number;
  global_commission_ride?: number;
  payment_due_days?: number;
  auto_suspend_days?: number;
  currency?: string;
}) => {
  return supabase
    .from("accounting_settings")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("id", 1);
};

// ==================== Financial Transactions ====================
export const getFinancialTransactions = async (filters?: {
  type?: string;
  status?: string;
  partnerId?: string;
}) => {
  let q = supabase
    .from("financial_transactions")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters?.type && filters.type !== "all") q = q.eq("transaction_type", filters.type);
  if (filters?.status && filters.status !== "all") q = q.eq("payment_status", filters.status);
  if (filters?.partnerId) q = q.eq("partner_id", filters.partnerId);
  return q;
};

export const createFinancialTransaction = async (tx: {
  transaction_type: string;
  reference_id: string;
  customer_id: string;
  partner_id: string;
  amount: number;
  platform_commission: number;
  partner_earning: number;
  payment_method: string;
  payment_status?: string;
  due_date?: string;
  metadata?: Record<string, unknown>;
}) => {
  return supabase.from("financial_transactions").insert(tx);
};

export const calculateCommission = async (
  amount: number,
  type: "booking" | "shipment" | "delivery" | "ride",
  partnerId?: string
): Promise<{ commission: number; earning: number }> => {
  // Check for partner-specific override first
  if (partnerId) {
    const { data: override } = await supabase
      .from("partner_commission_settings")
      .select("*")
      .eq("partner_id", partnerId)
      .eq("override_global", true)
      .maybeSingle();
    if (override) {
      const commission =
        override.commission_type === "percentage"
          ? (amount * Number(override.commission_value)) / 100
          : Number(override.commission_value);
      return { commission: Math.round(commission * 100) / 100, earning: Math.round((amount - commission) * 100) / 100 };
    }
  }

  const settings = await getAccountingSettings();
  const rateMap: Record<string, number> = {
    booking: Number(settings.global_commission_booking),
    delivery: Number(settings.global_commission_delivery),
    shipment: Number(settings.global_commission_shipment),
    ride: Number(settings.global_commission_ride),
  };
  const rate = rateMap[type] || 10;
  const commission = (amount * rate) / 100;
  return { commission: Math.round(commission * 100) / 100, earning: Math.round((amount - commission) * 100) / 100 };
};

// ==================== Partner Invoices ====================
export const getPartnerInvoices = async (filters?: { status?: string; partnerId?: string }) => {
  let q = supabase
    .from("partner_invoices")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters?.partnerId) q = q.eq("partner_id", filters.partnerId);
  return q;
};

export const updateInvoiceStatus = async (id: string, status: string, paidAt?: string) => {
  const update: Record<string, unknown> = { status };
  if (paidAt) update.paid_at = paidAt;
  return supabase.from("partner_invoices").update(update).eq("id", id);
};

// ==================== Payment Logs ====================
export const createPaymentLog = async (log: {
  invoice_id: string;
  amount_paid: number;
  payment_method: string;
  received_by: string;
  notes?: string;
}) => {
  return supabase.from("payment_logs").insert(log);
};

// ==================== Violation Logs ====================
export const getViolationLogs = async (filters?: { status?: string }) => {
  let q = supabase.from("violation_logs").select("*").order("created_at", { ascending: false });
  if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
  return q;
};

export const updateViolationStatus = async (
  id: string,
  status: string,
  reviewedBy: string
) => {
  return supabase
    .from("violation_logs")
    .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq("id", id);
};

// ==================== Suspicious Content Detection ====================
export const detectSuspiciousContent = (text: string): { found: boolean; type: string; details: string } | null => {
  // Yemeni phone numbers
  const yemeniPhone = /\b(77|73|71|70|78)\d{7}\b/;
  if (yemeniPhone.test(text)) return { found: true, type: "phone_number", details: `رقم هاتف يمني: ${text.match(yemeniPhone)?.[0]}` };

  // International phone
  const intlPhone = /\+\d{9,15}/;
  if (intlPhone.test(text)) return { found: true, type: "phone_number", details: `رقم دولي: ${text.match(intlPhone)?.[0]}` };

  // WhatsApp links
  const waLink = /wa\.me|whatsapp\.com|واتساب|واتس/i;
  if (waLink.test(text)) return { found: true, type: "whatsapp_link", details: "رابط واتساب أو ذكر واتساب" };

  // External contact keywords
  const externalKeywords = /تواصل خارج|خارج المنصة|رقمي الخاص/i;
  if (externalKeywords.test(text)) return { found: true, type: "external_contact", details: "محاولة تواصل خارج المنصة" };

  return null;
};

export const logViolation = async (
  userId: string,
  violationType: string,
  details: string,
  relatedEntityId?: string,
  severity: string = "medium"
) => {
  return supabase.from("violation_logs").insert({
    user_id: userId,
    violation_type: violationType,
    details,
    related_entity_id: relatedEntityId,
    severity,
  });
};

// ==================== Partner Commission Settings ====================
export const getPartnerCommissionSettings = async (partnerId: string) => {
  return supabase
    .from("partner_commission_settings")
    .select("*")
    .eq("partner_id", partnerId)
    .maybeSingle();
};

export const upsertPartnerCommission = async (
  partnerId: string,
  commissionType: string,
  commissionValue: number,
  overrideGlobal: boolean
) => {
  return supabase.from("partner_commission_settings").upsert(
    {
      partner_id: partnerId,
      commission_type: commissionType,
      commission_value: commissionValue,
      override_global: overrideGlobal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "partner_id" }
  );
};
