import { supabase } from "@/integrations/supabase/client";

// ==================== Regions ====================
export const getRegions = async () => {
  return supabase.from("regions").select("*").eq("is_active", true).order("name_ar");
};

// ==================== Trip Types ====================
export const getTripTypes = async () => {
  return supabase.from("trip_types").select("*").order("id");
};

// ==================== Trips ====================
export const getSupplierTrips = async (supplierId: string) => {
  return supabase.from("trips").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false });
};

export const createTrip = async (tripData: any) => {
  return supabase.from("trips").insert(tripData).select().single();
};

export const updateTrip = async (tripId: string, data: any) => {
  return supabase.from("trips").update(data).eq("id", tripId);
};

export const deleteTrip = async (tripId: string) => {
  return supabase.from("trips").delete().eq("id", tripId);
};

// ==================== Bookings ====================
export const getSupplierBookings = async (supplierId: string) => {
  const { data: trips } = await supabase.from("trips").select("id").eq("supplier_id", supplierId);
  if (!trips || trips.length === 0) return { data: [], error: null };
  const tripIds = trips.map((t) => t.id);
  return supabase.from("bookings").select("*").in("trip_id", tripIds).order("created_at", { ascending: false });
};

export const updateBookingStatus = async (bookingId: string, status: string) => {
  return supabase.from("bookings").update({ status }).eq("id", bookingId);
};

// ==================== Shipment Requests ====================
export const getSupplierShipmentRequests = async (supplierId: string) => {
  return supabase.from("shipment_requests").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false });
};

export const priceShipmentRequest = async (requestId: string, price: number, paymentMethod: string) => {
  return supabase.from("shipment_requests").update({
    price,
    payment_method: paymentMethod,
    supplier_priced: true,
    status: "priced",
    updated_at: new Date().toISOString(),
  }).eq("id", requestId);
};

export const updateShipmentRequestStatus = async (requestId: string, status: string) => {
  return supabase.from("shipment_requests").update({
    status,
    updated_at: new Date().toISOString(),
  }).eq("id", requestId);
};

// ==================== Finance ====================
export const getSupplierTransactions = async (supplierId: string) => {
  return supabase.from("supplier_transactions").select("*").eq("supplier_id", supplierId).order("date", { ascending: false });
};

export const createSupplierTransaction = async (data: any) => {
  return supabase.from("supplier_transactions").insert(data);
};

export const getPlatformTransactions = async (supplierId: string) => {
  return supabase.from("transactions").select("*").eq("partner_id", supplierId).order("created_at", { ascending: false });
};

// ==================== Bank Accounts ====================
export const getSupplierBankAccounts = async (supplierId: string) => {
  return supabase.from("partner_bank_accounts").select("*").eq("partner_id", supplierId).order("created_at");
};

export const addBankAccount = async (data: any) => {
  return supabase.from("partner_bank_accounts").insert(data);
};

export const deleteBankAccount = async (accountId: string) => {
  return supabase.from("partner_bank_accounts").delete().eq("id", accountId);
};

// ==================== Working Areas ====================
export const getSupplierWorkingAreas = async (supplierId: string) => {
  return supabase.from("supplier_working_areas").select("*, regions(*)").eq("supplier_id", supplierId);
};

export const updateWorkingAreas = async (supplierId: string, regionIds: number[]) => {
  await supabase.from("supplier_working_areas").delete().eq("supplier_id", supplierId);
  if (regionIds.length > 0) {
    const rows = regionIds.map((rid) => ({ supplier_id: supplierId, region_id: rid }));
    return supabase.from("supplier_working_areas").insert(rows);
  }
  return { error: null };
};

// ==================== Messages ====================
export const getSupplierConversations = async (supplierId: string) => {
  // Suppliers see conversations where they are the "admin" side or user side
  return supabase.from("conversations").select("*").or(`user_id.eq.${supplierId},admin_id.eq.${supplierId}`).order("updated_at", { ascending: false });
};

export const getConversationMessages = async (conversationId: string) => {
  return supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
};

export const sendSupplierMessage = async (conversationId: string, senderId: string, content: string) => {
  return supabase.from("messages").insert({ conversation_id: conversationId, sender_id: senderId, content });
};

// ==================== Profile ====================
export const updateProfile = async (userId: string, data: { full_name?: string; phone?: string; city?: string }) => {
  return supabase.from("profiles").update(data).eq("user_id", userId);
};

// ==================== Dashboard Stats ====================
export const getSupplierDashboardStats = async (supplierId: string) => {
  const [tripsRes, bookingsData, shipmentReqsRes, transactionsRes] = await Promise.all([
    supabase.from("trips").select("id, status, available_seats, price").eq("supplier_id", supplierId),
    getSupplierBookings(supplierId),
    supabase.from("shipment_requests").select("id, status, price").eq("supplier_id", supplierId),
    supabase.from("supplier_transactions").select("type, amount").eq("supplier_id", supplierId),
  ]);

  const trips = tripsRes.data || [];
  const bookings = bookingsData.data || [];
  const shipmentReqs = shipmentReqsRes.data || [];
  const txns = transactionsRes.data || [];

  const income = txns.filter((t: any) => t.type === "platform_payout" || t.type === "external_income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expenses = txns.filter((t: any) => t.type === "external_expense").reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);

  return {
    totalTrips: trips.length,
    activeTrips: trips.filter((t: any) => t.status === "approved").length,
    pendingTrips: trips.filter((t: any) => t.status === "pending").length,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((b: any) => b.status === "confirmed").length,
    totalShipmentRequests: shipmentReqs.length,
    pendingPricing: shipmentReqs.filter((s: any) => s.status === "pending_pricing").length,
    totalIncome: income,
    totalExpenses: expenses,
    netProfit: income - expenses,
  };
};
