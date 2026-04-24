import { supabase } from "@/integrations/supabase/client";

// ===== Restaurants =====
export const getRestaurants = async (companyId: string) => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("delivery_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createRestaurant = async (restaurant: any) => {
  const { data, error } = await supabase.from("restaurants").insert(restaurant).select().single();
  if (error) throw error;
  return data;
};

export const updateRestaurant = async (id: string, updates: any) => {
  const { data, error } = await supabase.from("restaurants").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteRestaurant = async (id: string) => {
  const { error } = await supabase.from("restaurants").delete().eq("id", id);
  if (error) throw error;
};

// ===== Menu Categories =====
export const getMenuCategories = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order");
  if (error) throw error;
  return data;
};

export const createMenuCategory = async (category: any) => {
  const { data, error } = await supabase.from("menu_categories").insert(category).select().single();
  if (error) throw error;
  return data;
};

export const updateMenuCategory = async (id: string, updates: any) => {
  const { data, error } = await supabase.from("menu_categories").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteMenuCategory = async (id: string) => {
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);
  if (error) throw error;
};

// ===== Menu Items =====
export const getMenuItems = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order");
  if (error) throw error;
  return data;
};

export const createMenuItem = async (item: any) => {
  const { data, error } = await supabase.from("menu_items").insert(item).select().single();
  if (error) throw error;
  return data;
};

export const updateMenuItem = async (id: string, updates: any) => {
  const { data, error } = await supabase.from("menu_items").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteMenuItem = async (id: string) => {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;
};

// ===== Riders =====
export const getRiders = async (companyId: string) => {
  const { data, error } = await supabase
    .from("riders")
    .select("*")
    .eq("delivery_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createRider = async (rider: any) => {
  const { data, error } = await supabase.from("riders").insert(rider).select().single();
  if (error) throw error;
  return data;
};

export const updateRider = async (id: string, updates: any) => {
  const { data, error } = await supabase.from("riders").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteRider = async (id: string) => {
  const { error } = await supabase.from("riders").delete().eq("id", id);
  if (error) throw error;
};

// ===== Delivery Orders =====
export const getDeliveryOrders = async (companyId: string, status?: string) => {
  let query = supabase
    .from("delivery_orders")
    .select("*, restaurant:restaurants(*), rider:riders(*)")
    .eq("delivery_company_id", companyId)
    .order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createDeliveryOrder = async (order: any) => {
  const { data, error } = await supabase.from("delivery_orders").insert(order).select().single();
  if (error) throw error;
  return data;
};

export const updateDeliveryOrder = async (id: string, updates: any) => {
  const { data, error } = await supabase.from("delivery_orders").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const assignRiderToOrder = async (orderId: string, riderId: string) => {
  // 1. Cancel any previously active cash collection for this order (re-assignment safety)
  try {
    await (supabase.from as any)("rider_cash_collections")
      .update({ status: "cancelled", notes: "تم إعادة تعيين مندوب آخر" })
      .eq("order_id", orderId)
      .in("status", ["pending_pickup", "collected"]);
  } catch (_) {}

  // 2. Assign rider on the order
  const { data, error } = await supabase
    .from("delivery_orders")
    .update({ rider_id: riderId, status: "assigned", assigned_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;

  // 3. Add tracking entry
  await supabase.from("order_tracking").insert({ order_id: orderId, status: "assigned", note: "تم تعيين مندوب" });

  // 4. If payment is cash → record outstanding cash on rider
  try {
    if (data && data.payment_method === "cash" && Number(data.total) > 0) {
      await (supabase.from as any)("rider_cash_collections").insert({
        rider_id: riderId,
        delivery_company_id: data.delivery_company_id,
        order_id: orderId,
        amount: Number(data.total),
        status: "pending_pickup",
      });
    }
  } catch (_) {}

  return data;
};

export const updateOrderStatus = async (orderId: string, status: string, note?: string) => {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
  if (status === "delivered") updates.delivered_at = new Date().toISOString();
  const { data, error } = await supabase.from("delivery_orders").update(updates).eq("id", orderId).select().single();
  if (error) throw error;
  await supabase.from("order_tracking").insert({ order_id: orderId, status, note });

  // Sync rider cash collection status
  try {
    if (status === "delivered") {
      await (supabase.from as any)("rider_cash_collections")
        .update({ status: "collected", collected_at: new Date().toISOString() })
        .eq("order_id", orderId)
        .eq("status", "pending_pickup");
    } else if (status === "cancelled") {
      await (supabase.from as any)("rider_cash_collections")
        .update({ status: "cancelled", notes: "تم إلغاء الطلب" })
        .eq("order_id", orderId)
        .in("status", ["pending_pickup", "collected"]);
    }
  } catch (_) {}

  return data;
};

// ===== Rider Cash Collections =====
export const getRiderOutstandingCash = async (riderId: string): Promise<number> => {
  const { data, error } = await (supabase.from as any)("rider_cash_collections")
    .select("amount, status")
    .eq("rider_id", riderId)
    .in("status", ["pending_pickup", "collected"]);
  if (error) return 0;
  return (data || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
};

export const getRiderCashCollections = async (companyId: string, riderId?: string) => {
  let q = (supabase.from as any)("rider_cash_collections")
    .select("*, rider:riders(id, full_name, phone), order:delivery_orders(id, customer_name, customer_address, total, payment_method)")
    .eq("delivery_company_id", companyId)
    .order("created_at", { ascending: false });
  if (riderId) q = q.eq("rider_id", riderId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

export const settleRiderCash = async (collectionId: string, settledBy: string, notes?: string) => {
  const { data, error } = await (supabase.from as any)("rider_cash_collections")
    .update({
      status: "settled",
      settled_at: new Date().toISOString(),
      settled_by: settledBy,
      notes: notes || null,
    })
    .eq("id", collectionId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ===== Order Tracking =====
export const getOrderTracking = async (orderId: string) => {
  const { data, error } = await supabase
    .from("order_tracking")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
};

// ===== Custom Links =====
export const getCustomLinks = async (companyId: string) => {
  const { data, error } = await supabase
    .from("custom_links")
    .select("*")
    .eq("delivery_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createCustomLink = async (link: any) => {
  const { data, error } = await supabase.from("custom_links").insert(link).select().single();
  if (error) throw error;
  return data;
};

export const deleteCustomLink = async (id: string) => {
  const { error } = await supabase.from("custom_links").delete().eq("id", id);
  if (error) throw error;
};

// ===== Rider Rewards =====
export const getRiderRewards = async (companyId: string) => {
  const { data, error } = await supabase
    .from("rider_rewards")
    .select("*, rider:riders(*)")
    .eq("delivery_company_id", companyId)
    .order("achieved_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createRiderReward = async (reward: any) => {
  const { data, error } = await supabase.from("rider_rewards").insert(reward).select().single();
  if (error) throw error;
  return data;
};

// ===== Partner Join Requests =====
export const getPartnerRequests = async (companyId: string) => {
  const { data, error } = await supabase
    .from("partner_join_requests")
    .select("*")
    .eq("delivery_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const updatePartnerRequest = async (id: string, updates: any) => {
  const { data, error } = await supabase.from("partner_join_requests").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

// ===== Dashboard Stats =====
export const getDeliveryStats = async (companyId: string) => {
  const today = new Date().toISOString().split("T")[0];
  const [ordersRes, ridersRes, todayOrdersRes] = await Promise.all([
    supabase.from("delivery_orders").select("id, total, status").eq("delivery_company_id", companyId),
    supabase.from("riders").select("id, is_online").eq("delivery_company_id", companyId),
    supabase.from("delivery_orders").select("id, total").eq("delivery_company_id", companyId).gte("created_at", today),
  ]);
  const orders = ordersRes.data || [];
  const riders = ridersRes.data || [];
  const todayOrders = todayOrdersRes.data || [];
  return {
    totalOrders: orders.length,
    activeOrders: orders.filter((o: any) => !["delivered", "cancelled", "returned"].includes(o.status)).length,
    totalRevenue: orders.filter((o: any) => o.status === "delivered").reduce((s: number, o: any) => s + Number(o.total), 0),
    todayRevenue: todayOrders.reduce((s: number, o: any) => s + Number(o.total), 0),
    totalRiders: riders.length,
    onlineRiders: riders.filter((r: any) => r.is_online).length,
    todayOrders: todayOrders.length,
  };
};

// ===== Delivery Banners =====
export const getDeliveryBanners = async (companyId?: string, city?: string) => {
  let q = supabase.from("delivery_banners").select("*").eq("is_active", true).order("sort_order");
  if (companyId) q = q.eq("delivery_company_id", companyId);
  if (city) q = q.or(`city.eq.${city},city.is.null`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

export const getBannersForPortal = async (companyId: string) => {
  const { data, error } = await supabase.from("delivery_banners").select("*").eq("delivery_company_id", companyId).order("sort_order");
  if (error) throw error;
  return data || [];
};

export const createBanner = async (banner: any) => {
  const { data, error } = await supabase.from("delivery_banners").insert(banner).select().single();
  if (error) throw error;
  return data;
};

export const updateBanner = async (id: string, updates: any) => {
  const { data, error } = await supabase.from("delivery_banners").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteBanner = async (id: string) => {
  const { error } = await supabase.from("delivery_banners").delete().eq("id", id);
  if (error) throw error;
};
