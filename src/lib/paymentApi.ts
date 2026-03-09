import { supabase } from "@/integrations/supabase/client";

// ==================== Platform Bank Accounts ====================
export const getPlatformBankAccounts = async () => {
  const { data, error } = await supabase
    .from("platform_bank_accounts")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return data || [];
};

// Legacy - kept for backward compatibility
export const getPlatformAccounts = async () => {
  return getPlatformBankAccounts();
};

export const getPartnerAccounts = async (partnerId: string) => {
  const { data, error } = await supabase
    .from("payment_accounts" as any)
    .select("*")
    .eq("owner_id", partnerId)
    .eq("is_active", true);
  if (error) throw error;
  return data || [];
};

// ==================== Settings ====================
export const getAccountingSettings = async () => {
  const { data } = await supabase
    .from("accounting_settings")
    .select("*")
    .limit(1)
    .single();
  return data;
};

export const getCashOnDeliverySetting = async (): Promise<boolean> => {
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "cash_on_delivery_enabled")
    .maybeSingle();
  return data?.value === "true";
};

// ==================== Trip & Supplier Details ====================
export const getTripDetails = async (tripId: string) => {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();
  if (error) throw error;
  return data;
};

export const getSupplierProfile = async (supplierId: string) => {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, company_name, phone")
    .eq("user_id", supplierId)
    .single();
  return data;
};

// ==================== Payment Transactions ====================
export const createPaymentTransaction = async (tx: {
  user_id: string;
  related_entity_id: string;
  entity_type: string;
  amount: number;
  payment_method: string;
  transfer_receipt_url?: string;
  transfer_reference?: string;
  partner_id?: string;
}) => {
  const { data, error } = await supabase
    .from("payment_transactions" as any)
    .insert(tx)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const createFinancialTransaction = async (ft: {
  transaction_type: string;
  reference_id: string;
  customer_id: string;
  partner_id: string;
  amount: number;
  platform_commission: number;
  partner_earning: number;
  payment_method: string;
  payment_status: string;
  payment_transaction_id?: string;
  partner_name?: string;
  partner_phone?: string;
}) => {
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert(ft)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getPaymentTransactions = async (filters?: {
  status?: string;
  userId?: string;
  partnerId?: string;
}) => {
  let q = supabase
    .from("payment_transactions" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters?.userId) q = q.eq("user_id", filters.userId);
  if (filters?.partnerId) q = q.eq("partner_id", filters.partnerId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

export const updatePaymentTransaction = async (
  id: string,
  updates: { status?: string; verified_by?: string; verified_at?: string; notes?: string }
) => {
  const { error } = await supabase
    .from("payment_transactions" as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// ==================== Helpers ====================
export const getEntityDetails = async (entityType: string, entityId: string) => {
  const tableMap: Record<string, string> = {
    booking: "bookings",
    shipment: "shipment_requests",
    delivery: "delivery_orders",
    ride: "ride_requests",
  };
  const table = tableMap[entityType];
  if (!table) return null;
  const { data } = await supabase.from(table as any).select("*").eq("id", entityId).single();
  return data;
};

export const uploadPaymentReceipt = async (userId: string, file: File) => {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("payment-receipts")
    .upload(path, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from("payment-receipts")
    .getPublicUrl(path);
  return urlData.publicUrl;
};

export const linkPaymentToFinancial = async (
  financialTransactionId: string,
  paymentTransactionId: string
) => {
  await supabase
    .from("financial_transactions")
    .update({ payment_transaction_id: paymentTransactionId } as any)
    .eq("id", financialTransactionId);
};
