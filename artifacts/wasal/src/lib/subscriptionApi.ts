import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  plan: any | null;
  subscription: any | null;
  ordersUsedThisMonth: number;
  orderLimitReached: boolean;
}

export const getPartnerSubscriptionStatus = async (partnerId: string): Promise<SubscriptionStatus> => {
  const { data: sub } = await (supabase as any)
    .from("partner_subscriptions")
    .select("*, subscription_plans(*)")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    return {
      hasActiveSubscription: false,
      isExpired: true,
      isExpiringSoon: false,
      plan: null,
      subscription: null,
      ordersUsedThisMonth: 0,
      orderLimitReached: false,
    };
  }

  const plan = (sub as any).subscription_plans;
  const periodEnd = new Date(sub.current_period_end);
  const now = new Date();
  const isExpired = sub.status !== "active" || periodEnd < now;
  const daysLeft = (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const isExpiringSoon = !isExpired && daysLeft <= 3;

  let ordersUsedThisMonth = 0;
  let orderLimitReached = false;
  if (plan?.max_orders_per_month) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count } = await supabase
      .from("delivery_orders")
      .select("id", { count: "exact", head: true })
      .eq("delivery_company_id", partnerId)
      .gte("created_at", monthStart);
    ordersUsedThisMonth = count || 0;
    orderLimitReached = ordersUsedThisMonth >= plan.max_orders_per_month;
  }

  return {
    hasActiveSubscription: !isExpired,
    isExpired,
    isExpiringSoon,
    plan,
    subscription: sub,
    ordersUsedThisMonth,
    orderLimitReached,
  };
};

export const getAllSubscriptionPlans = async () => {
  const { data, error } = await (supabase as any)
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data || [];
};

export const getAllSubscriptionPlansAdmin = async () => {
  const { data, error } = await (supabase as any)
    .from("subscription_plans")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data || [];
};

export const subscribeToPlan = async (
  partnerId: string,
  planId: string,
  billingCycle: "monthly" | "yearly"
) => {
  const { data: plan } = await (supabase as any)
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (!plan) throw new Error("الخطة غير موجودة");

  const now = new Date();
  let periodEnd: Date;
  if (plan.is_trial && plan.trial_days) {
    periodEnd = new Date(now.getTime() + plan.trial_days * 24 * 60 * 60 * 1000);
  } else if (billingCycle === "yearly") {
    periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  } else {
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  await (supabase as any)
    .from("partner_subscriptions")
    .update({ status: "cancelled", cancelled_at: now.toISOString() })
    .eq("partner_id", partnerId)
    .eq("status", "active");

  return (supabase as any)
    .from("partner_subscriptions")
    .insert({
      partner_id: partnerId,
      partner_type: "delivery_company",
      plan_id: planId,
      status: plan.price_monthly === 0 || plan.is_trial ? "active" : "pending_payment",
      billing_cycle: billingCycle,
      started_at: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      auto_renew: true,
    })
    .select()
    .single();
};

export const cancelSubscription = async (subscriptionId: string) => {
  return (supabase as any)
    .from("partner_subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      auto_renew: false,
    })
    .eq("id", subscriptionId);
};

export const upsertSubscriptionPlan = async (plan: {
  id?: string;
  name: string;
  name_ar: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  max_orders_per_month?: number | null;
  max_restaurants?: number | null;
  max_riders?: number | null;
  commission_override_type?: string | null;
  commission_override_value?: number | null;
  features?: string[];
  is_trial?: boolean;
  trial_days?: number | null;
  sort_order?: number;
  is_active?: boolean;
}) => {
  if (plan.id) {
    const { id, ...updates } = plan;
    return (supabase as any)
      .from("subscription_plans")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
  }
  return (supabase as any)
    .from("subscription_plans")
    .insert({ ...plan, updated_at: new Date().toISOString() })
    .select()
    .single();
};

export const adminSetPartnerSubscription = async (
  partnerId: string,
  planId: string,
  billingCycle: "monthly" | "yearly",
  periodEnd: string,
  status: "active" | "pending_payment" | "cancelled" = "active"
) => {
  await (supabase as any)
    .from("partner_subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("partner_id", partnerId)
    .eq("status", "active");

  return (supabase as any)
    .from("partner_subscriptions")
    .insert({
      partner_id: partnerId,
      partner_type: "delivery_company",
      plan_id: planId,
      status,
      billing_cycle: billingCycle,
      started_at: new Date().toISOString(),
      current_period_end: periodEnd,
      auto_renew: true,
    })
    .select()
    .single();
};
