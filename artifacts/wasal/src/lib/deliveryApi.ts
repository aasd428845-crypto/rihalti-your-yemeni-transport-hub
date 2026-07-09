import { supabase } from "@/integrations/supabase/client";

// ===== Restaurants =====
export const getRestaurants = async (companyId: string, page = 1, pageSize = 50) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from("restaurants")
    .select("*", { count: "exact" })
    .eq("delivery_company_id", companyId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data: data || [], count: count ?? 0 };
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
  // Soft-delete: mark as inactive instead of hard-deleting to avoid FK constraint
  // errors from delivery_orders that reference this restaurant.
  const { error } = await supabase
    .from("restaurants")
    .update({ is_active: false } as any)
    .eq("id", id);
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
export const getDeliveryOrders = async (
  companyId: string,
  status?: string,
  page = 1,
  pageSize = 25,
  search?: string,
): Promise<{ data: any[]; count: number }> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("delivery_orders")
    .select("*, restaurant:restaurants(*)", { count: "exact" })
    .eq("delivery_company_id", companyId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status && status !== "all") query = query.eq("status", status);
  if (search?.trim()) {
    query = query.or(
      `customer_name.ilike.%${search.trim()}%,customer_phone.ilike.%${search.trim()}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  if (!data?.length) return { data: [], count: count ?? 0 };

  // Enrich orders with rider data via a separate query (no FK in schema cache)
  const riderIds = [
    ...new Set(data.filter((o: any) => o.rider_id).map((o: any) => o.rider_id as string)),
  ];
  if (riderIds.length > 0) {
    const { data: riders } = await supabase
      .from("riders")
      .select("id, full_name, phone, vehicle_type, vehicle_plate")
      .in("id", riderIds);
    if (riders) {
      const riderMap: Record<string, any> = Object.fromEntries(
        riders.map((r: any) => [r.id, r]),
      );
      return {
        data: data.map((o: any) => ({
          ...o,
          rider: o.rider_id ? (riderMap[o.rider_id] ?? null) : null,
        })),
        count: count ?? 0,
      };
    }
  }
  return { data: data.map((o: any) => ({ ...o, rider: null })), count: count ?? 0 };
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
  const { data: userData } = await supabase.auth.getUser();
  const assignedBy = userData?.user?.id;
  if (!assignedBy) throw new Error("يجب تسجيل الدخول لتعيين مندوب");

  const { data, error } = await supabase.rpc("assign_rider_to_order", {
    p_order_id: orderId,
    p_rider_id: riderId,
    p_assigned_by: assignedBy,
  });
  if (error) throw error;

  return data;
};

export const updateOrderStatus = async (orderId: string, status: string, note?: string) => {
  const { data, error } = await supabase.rpc("update_delivery_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_note: note ?? null,
  } as any);
  if (error) throw error;
  return data;
};

// ===== Rider Cash Collections =====
export const getRiderOutstandingCash = async (riderId: string): Promise<number> => {
  const { data, error } = await supabase.from("rider_cash_collections")
    .select("amount, status")
    .eq("rider_id", riderId)
    .in("status", ["pending_pickup", "collected"]);
  if (error) return 0;
  return (data || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
};

export const getRiderCashCollections = async (
  companyId: string,
  riderId?: string,
  page = 1,
  pageSize = 25,
) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let q = supabase
    .from("rider_cash_collections")
    .select(
      "*, rider:riders(id, full_name, phone), order:delivery_orders(id, customer_name, customer_address, total, payment_method)",
      { count: "exact" },
    )
    .eq("delivery_company_id", companyId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (riderId) q = q.eq("rider_id", riderId);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data || [], count: count ?? 0 };
};

export const settleRiderCash = async (collectionId: string, settledBy: string, notes?: string) => {
  const { data, error } = await supabase.from("rider_cash_collections")
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

// ===== Rider Statistics =====
export const getRiderStats = async (riderId: string) => {
  const today = new Date().toISOString().split("T")[0];

  const [riderRes, allOrdersRes, todayOrdersRes, cashRes] = await Promise.all([
    supabase.from("riders").select("*").eq("id", riderId).maybeSingle(),
    supabase
      .from("delivery_orders")
      .select("id, total, delivery_fee, status, created_at, customer_name, customer_phone, payment_method")
      .eq("rider_id", riderId)
      .order("created_at", { ascending: false }),
    supabase
      .from("delivery_orders")
      .select("id, total, delivery_fee, status, payment_method")
      .eq("rider_id", riderId)
      .gte("created_at", today),
    supabase
      .from("rider_cash_collections")
      .select("*, order:delivery_orders(id, customer_name, total, created_at)")
      .eq("rider_id", riderId)
      .order("created_at", { ascending: false }),
  ]);

  const allOrders = allOrdersRes.data || [];
  const todayOrders = todayOrdersRes.data || [];
  const cash = cashRes.data || [];

  const deliveredOrders = allOrders.filter((o: any) => o.status === "delivered");
  const todayDelivered = todayOrders.filter((o: any) => o.status === "delivered");

  return {
    rider: riderRes.data,
    totalOrders: allOrders.length,
    deliveredOrders: deliveredOrders.length,
    totalCashValue: deliveredOrders
      .filter((o: any) => o.payment_method === "cash")
      .reduce((s: number, o: any) => s + Number(o.total || 0), 0),
    totalDeliveryFees: deliveredOrders
      .reduce((s: number, o: any) => s + Number(o.delivery_fee || 0), 0),
    todayOrders: todayOrders.length,
    todayDelivered: todayDelivered.length,
    todayCashValue: todayDelivered
      .filter((o: any) => o.payment_method === "cash")
      .reduce((s: number, o: any) => s + Number(o.total || 0), 0),
    pendingCash: cash
      .filter((c: any) => ["pending_pickup", "collected"].includes(c.status))
      .reduce((s: number, c: any) => s + Number(c.amount || 0), 0),
    settledCash: cash
      .filter((c: any) => c.status === "settled")
      .reduce((s: number, c: any) => s + Number(c.amount || 0), 0),
    recentOrders: allOrders.slice(0, 30),
    cashCollections: cash.slice(0, 20),
  };
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
