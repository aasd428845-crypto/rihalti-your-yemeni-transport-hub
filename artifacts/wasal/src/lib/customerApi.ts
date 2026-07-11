import { supabase } from "@/integrations/supabase/client";
import type { DeliveryFormData } from "@/types/customer.types";

// Helper: check auto-approve setting
const getAutoApproveSetting = async (key: string): Promise<boolean> => {
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value === "true";
};

// ---- Addresses ----
export const fetchAddresses = async (customerId: string) => {
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createAddress = async (address: {
  customer_id: string;
  customer_name?: string;
  address_name: string;
  full_address: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
  phone?: string;
  landmark?: string;
  city?: string;
  district?: string;
  street?: string;
  building_number?: string;
}) => {
  if (address.is_default) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", address.customer_id);
  }
  const { data, error } = await supabase.from("customer_addresses").insert(address as any).select().single();
  if (error) throw error;
  return data;
};

export const deleteAddress = async (id: string) => {
  const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
  if (error) throw error;
};

export const updateAddress = async (
  id: string,
  customerId: string,
  updates: {
    customer_name?: string;
    address_name?: string;
    full_address?: string;
    latitude?: number | null;
    longitude?: number | null;
    is_default?: boolean;
    phone?: string | null;
    landmark?: string | null;
    city?: string;
    district?: string | null;
    street?: string | null;
    building_number?: string | null;
  }
) => {
  if (updates.is_default) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", customerId)
      .neq("id", id);
  }
  const { data, error } = await supabase
    .from("customer_addresses")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ---- Regions ----
export const fetchRegions = async () => {
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("is_active", true)
    .order("name_ar");
  if (error) throw error;
  return data;
};

export const fetchRegionsByParent = async (parentId: number) => {
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .order("name_ar");
  if (error) throw error;
  return data;
};

export const fetchCountries = async () => {
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("type", "country")
    .eq("is_active", true)
    .order("name_ar");
  if (error) throw error;
  return data;
};

// ---- Bookings (read-only history) ----
export const fetchMyBookings = async (customerId: string) => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, trip:trips(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

// ---- Shipments (read-only history) ----
export const fetchMyShipments = async (customerId: string) => {
  const { data, error } = await supabase
    .from("shipment_requests")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

// ---- Deliveries ----
// Returns only LOCAL delivery companies (food/parcel couriers).
// Excludes users who are also "supplier" (i.e. inter-city transport offices
// like "مكتب الأمانة للنقل") even if they were mistakenly granted both roles.
export const fetchDeliveryCompanies = async () => {
  // 1. All users with delivery_company role
  const { data: dcRoles, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "delivery_company");
  if (error) throw error;
  if (!dcRoles || dcRoles.length === 0) return [];

  const dcIds = dcRoles.map((r) => r.user_id);

  // 2. Of those, find which ones are ALSO supplier (transport offices)
  const { data: supplierRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "supplier")
    .in("user_id", dcIds);

  const supplierSet = new Set((supplierRoles || []).map((r: any) => r.user_id));
  const realDcIds = dcIds.filter((id) => !supplierSet.has(id));
  if (realDcIds.length === 0) return [];

  // 3. Fetch profiles only for "pure" delivery companies
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("user_id", realDcIds);
  if (pErr) throw pErr;
  return profiles || [];
};

export const fetchRestaurantsByCompany = async (companyId: string) => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("delivery_company_id", companyId)
    .eq("is_active", true);
  if (error) throw error;
  return data;
};

export const createDeliveryOrder = async (order: DeliveryFormData & { customer_id?: string }) => {
  const autoApprove = await getAutoApproveSetting("auto_approve_deliveries");
  const status = autoApprove ? "pending" : "pending_approval";

  const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + order.delivery_fee;

  const { data, error } = await supabase.from("delivery_orders").insert({
    delivery_company_id: order.delivery_company_id,
    restaurant_id: order.restaurant_id || null,
    customer_id: order.customer_id || null,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_address: order.customer_address,
    delivery_lat: order.delivery_lat,
    delivery_lng: order.delivery_lng,
    order_type: order.order_type,
    items: order.items,
    subtotal,
    delivery_fee: order.delivery_fee,
    total,
    payment_method: order.payment_method,
    notes: order.notes,
    status,
    payment_status: "pending",
  }).select().single();
  if (error) throw error;
  return data;
};

export const fetchMyDeliveryOrders = async (customerId: string) => {
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

// ---- Cancellation ----
export const createCancellationRequest = async (req: {
  user_id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
}) => {
  const { data, error } = await supabase.from("cancellation_requests").insert({
    user_id: req.user_id,
    entity_type: req.entity_type,
    entity_id: req.entity_id,
    reason: req.reason,
    status: "pending",
  }).select().single();
  if (error) throw error;
  return data;
};

// ---- Supplier Bank Accounts (for trip details page) ----
export const fetchSupplierBankAccounts = async (supplierId: string) => {
  const { data, error } = await supabase
    .from("partner_bank_accounts")
    .select("*")
    .eq("partner_id", supplierId);
  if (error) throw error;
  return data;
};

// ---- Stats ----
export const fetchHomeStats = async () => {
  const [tripsRes, suppliersRes, deliveryRes] = await Promise.all([
    supabase.from("trips").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "supplier"),
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "delivery_company"),
  ]);
  return {
    tripsCount: tripsRes.count || 0,
    suppliersCount: suppliersRes.count || 0,
    deliveryCount: deliveryRes.count || 0,
  };
};

// ---- Distinct bus companies ----
export const fetchDistinctBusCompanies = async () => {
  const { data, error } = await supabase
    .from("trips")
    .select("bus_company")
    .eq("status", "approved")
    .not("bus_company", "is", null);
  if (error) throw error;
  const unique = [...new Set((data || []).map(d => d.bus_company).filter(Boolean))];
  return unique as string[];
};

// ---- Profile ----
export const updateProfile = async (userId: string, data: { full_name?: string; phone?: string; city?: string }) => {
  const { error } = await supabase.from("profiles").update(data).eq("user_id", userId);
  if (error) throw error;
};
