import { supabase } from "@/integrations/supabase/client";

// ===== Public Restaurant Queries =====
export const getActiveRestaurants = async (city?: string) => {
  let query = supabase
    .from("restaurants")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false });

  if (city && city !== "all") {
    query = query.eq("city", city);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getRestaurantById = async (id: string) => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

export const getRestaurantMenu = async (restaurantId: string) => {
  const [catRes, itemRes] = await Promise.all([
    supabase.from("menu_categories").select("*").eq("restaurant_id", restaurantId).eq("is_active", true).order("sort_order"),
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).eq("is_available", true).order("sort_order"),
  ]);
  if (catRes.error) throw catRes.error;
  if (itemRes.error) throw itemRes.error;
  return { categories: catRes.data || [], items: itemRes.data || [] };
};

export const getMenuItemOptions = async (menuItemId: string) => {
  const { data, error } = await supabase
    .from("menu_item_options")
    .select("*")
    .eq("menu_item_id", menuItemId);
  if (error) throw error;
  return data;
};

export const getRestaurantReviews = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("restaurant_reviews")
    .select("*, profiles:customer_id(full_name, avatar_url)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
};

// ===== Cart =====
export const getCart = async (customerId: string, restaurantId: string) => {
  const { data, error } = await supabase
    .from("carts")
    .select("*")
    .eq("customer_id", customerId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const upsertCart = async (cart: { customer_id: string; restaurant_id: string; items: any[]; total_amount: number }) => {
  // Check existing
  const existing = await getCart(cart.customer_id, cart.restaurant_id);
  if (existing) {
    const { data, error } = await supabase.from("carts").update({
      items: cart.items as any,
      total_amount: cart.total_amount,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from("carts").insert({
      customer_id: cart.customer_id,
      restaurant_id: cart.restaurant_id,
      items: cart.items as any,
      total_amount: cart.total_amount,
    }).select().single();
    if (error) throw error;
    return data;
  }
};

export const clearCart = async (customerId: string, restaurantId: string) => {
  const { error } = await supabase.from("carts").delete().eq("customer_id", customerId).eq("restaurant_id", restaurantId);
  if (error) throw error;
};

// ===== Reviews =====
export const createReview = async (review: { restaurant_id: string; customer_id: string; rating: number; review?: string }) => {
  const { data, error } = await supabase.from("restaurant_reviews").insert(review).select().single();
  if (error) throw error;
  // Update restaurant rating
  const { data: reviews } = await supabase.from("restaurant_reviews").select("rating").eq("restaurant_id", review.restaurant_id);
  if (reviews && reviews.length > 0) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await supabase.from("restaurants").update({ rating: Math.round(avg * 100) / 100, total_ratings: reviews.length }).eq("id", review.restaurant_id);
  }
  return data;
};

// ===== Menu Item Options Management =====
export const createMenuItemOption = async (option: any) => {
  const { data, error } = await supabase.from("menu_item_options").insert(option).select().single();
  if (error) throw error;
  return data;
};

export const updateMenuItemOption = async (id: string, updates: any) => {
  const { data, error } = await supabase.from("menu_item_options").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteMenuItemOption = async (id: string) => {
  const { error } = await supabase.from("menu_item_options").delete().eq("id", id);
  if (error) throw error;
};

// ===== Create order from cart =====
export const createOrderFromCart = async (params: {
  customer_id: string;
  restaurant_id: string;
  delivery_company_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  payment_method: string;
  notes?: string;
}) => {
  const insertData: any = {
    customer_id: params.customer_id,
    restaurant_id: params.restaurant_id,
    delivery_company_id: params.delivery_company_id,
    customer_name: params.customer_name,
    customer_phone: params.customer_phone,
    customer_address: params.customer_address,
    delivery_lat: params.delivery_lat,
    delivery_lng: params.delivery_lng,
    items: params.items as any,
    subtotal: params.subtotal,
    delivery_fee: params.delivery_fee,
    tax: params.tax,
    total: params.total,
    payment_method: params.payment_method,
    status: "pending",
    payment_status: "pending",
    order_type: "restaurant",
  };
  // Only include notes if provided (optional field)
  if (params.notes) {
    insertData.notes = params.notes;
  }
  const { data, error } = await supabase.from("delivery_orders").insert(insertData).select().single();
  if (error) throw error;

  // Create financial transaction
  const commissionRate = 12; // default delivery commission
  const platformCommission = Math.floor(params.total * commissionRate / 100);
  const partnerEarning = params.total - platformCommission;
  await supabase.from("financial_transactions").insert({
    reference_id: data.id,
    transaction_type: "delivery",
    customer_id: params.customer_id,
    partner_id: params.delivery_company_id,
    amount: params.total,
    platform_commission: platformCommission,
    partner_earning: partnerEarning,
    payment_method: params.payment_method,
    payment_status: "pending",
  });

  // Clear cart
  await clearCart(params.customer_id, params.restaurant_id);
  return data;
};
