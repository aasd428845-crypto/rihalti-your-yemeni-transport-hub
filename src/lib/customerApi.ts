import { supabase } from "@/integrations/supabase/client";
import type { TripSearchParams, BookingFormData, ShipmentFormData, DeliveryFormData } from "@/types/customer.types";

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
  address_name: string;
  full_address: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}) => {
  if (address.is_default) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", address.customer_id);
  }
  const { data, error } = await supabase.from("customer_addresses").insert(address).select().single();
  if (error) throw error;
  return data;
};

export const deleteAddress = async (id: string) => {
  const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
  if (error) throw error;
};

// ---- Trips ----
export const searchTrips = async (params: TripSearchParams) => {
  let query = supabase
    .from("trips")
    .select("*")
    .eq("status", "approved")
    .gte("available_seats", 1)
    .gte("departure_time", new Date().toISOString());

  if (params.from_city) query = query.ilike("from_city", `%${params.from_city}%`);
  if (params.to_city) query = query.ilike("to_city", `%${params.to_city}%`);
  if (params.date) {
    const start = new Date(params.date);
    const end = new Date(params.date);
    end.setDate(end.getDate() + 1);
    query = query.gte("departure_time", start.toISOString()).lt("departure_time", end.toISOString());
  }

  const { data, error } = await query.order("departure_time", { ascending: true });
  if (error) throw error;
  return data;
};

export const fetchFeaturedTrips = async () => {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("status", "approved")
    .gte("available_seats", 1)
    .gte("departure_time", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) throw error;
  return data;
};

export const fetchTripById = async (id: string) => {
  const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
};

// ---- Bookings ----
export const createBooking = async (booking: BookingFormData & { customer_id: string }) => {
  const { data, error } = await supabase.from("bookings").insert({
    trip_id: booking.trip_id,
    customer_id: booking.customer_id,
    seat_count: booking.seat_count,
    total_amount: booking.total_amount,
    payment_method: booking.payment_method,
    status: "confirmed",
    payment_status: "pending",
  }).select().single();
  if (error) throw error;

  // Decrease available seats
  await supabase.rpc("has_role", { _user_id: booking.customer_id, _role: "customer" }); // dummy to keep auth
  const trip = await fetchTripById(booking.trip_id);
  if (trip) {
    await supabase
      .from("trips")
      .update({ available_seats: Math.max(0, trip.available_seats - booking.seat_count) })
      .eq("id", booking.trip_id);
  }

  return data;
};

export const fetchMyBookings = async (customerId: string) => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, trip:trips(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

// ---- Shipments ----
export const fetchSuppliers = async () => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "supplier");
  if (error) throw error;

  if (!data || data.length === 0) return [];

  const userIds = data.map((r) => r.user_id);
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("user_id", userIds);
  if (pErr) throw pErr;
  return profiles || [];
};

export const createShipmentRequest = async (shipment: ShipmentFormData & { customer_id: string }) => {
  const { data, error } = await supabase.from("shipment_requests").insert({
    customer_id: shipment.customer_id,
    supplier_id: shipment.supplier_id,
    shipment_type: shipment.shipment_type,
    pickup_address: shipment.pickup_address,
    pickup_lat: shipment.pickup_lat,
    pickup_lng: shipment.pickup_lng,
    delivery_address: shipment.delivery_address,
    delivery_lat: shipment.delivery_lat,
    delivery_lng: shipment.delivery_lng,
    recipient_name: shipment.recipient_name,
    recipient_phone: shipment.recipient_phone,
    item_description: shipment.item_description,
    item_weight: shipment.item_weight,
    item_dimensions: shipment.item_dimensions,
    payment_method: shipment.payment_method,
    status: "pending_approval",
  }).select().single();
  if (error) throw error;
  return data;
};

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
export const fetchDeliveryCompanies = async () => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "delivery_company");
  if (error) throw error;

  if (!data || data.length === 0) return [];

  const userIds = data.map((r) => r.user_id);
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("user_id", userIds);
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
    status: "pending",
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

// ---- Profile ----
export const updateProfile = async (userId: string, data: { full_name?: string; phone?: string; city?: string }) => {
  const { error } = await supabase.from("profiles").update(data).eq("user_id", userId);
  if (error) throw error;
};
