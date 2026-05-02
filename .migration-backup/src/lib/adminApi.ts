import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/admin.types";

// ==================== Users ====================
export const getUsers = async () => {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, phone, city, avatar_url, created_at, account_status"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const roleMap = new Map((rolesRes.data || []).map((r) => [r.user_id, r.role]));
  return (profilesRes.data || []).map((p) => ({ ...p, role: roleMap.get(p.user_id) || "customer" }));
};

export const updateUserRole = async (userId: string, newRole: AppRole) => {
  return supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
};

// ==================== Approvals ====================
export const getPendingApprovals = async (type?: string) => {
  let q = supabase.from("approval_requests").select("*").order("created_at", { ascending: false });
  if (type && type !== "all") q = q.eq("type", type);
  return q;
};

export const approveRequest = async (id: string, adminId: string) => {
  return supabase.from("approval_requests").update({
    status: "approved", reviewed_by: adminId, reviewed_at: new Date().toISOString(),
  }).eq("id", id);
};

export const rejectRequest = async (id: string, adminId: string, notes?: string) => {
  return supabase.from("approval_requests").update({
    status: "rejected", reviewed_by: adminId, reviewed_at: new Date().toISOString(), admin_notes: notes || null,
  }).eq("id", id);
};

// ==================== Trips ====================
export const getTrips = async () => {
  return supabase.from("trips").select("*").order("created_at", { ascending: false });
};

// ==================== Shipments ====================
export const getShipments = async () => {
  return supabase.from("shipments").select("*").order("created_at", { ascending: false });
};

// ==================== Deliveries ====================
export const getDeliveries = async () => {
  return supabase.from("deliveries").select("*").order("created_at", { ascending: false });
};

// ==================== Transactions ====================
export const getTransactions = async (filters?: { type?: string; status?: string }) => {
  let q = supabase.from("transactions").select("*").order("created_at", { ascending: false });
  if (filters?.type && filters.type !== "all") q = q.eq("type", filters.type);
  if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
  return q;
};

// ==================== Payouts ====================
export const getPayouts = async () => {
  return supabase.from("payouts").select("*").order("created_at", { ascending: false });
};

export const updatePayoutStatus = async (id: string, status: string) => {
  return supabase.from("payouts").update({
    status, paid_at: status === "paid" ? new Date().toISOString() : null,
  }).eq("id", id);
};

// ==================== Cancellations ====================
export const getCancellationRequests = async () => {
  return supabase.from("cancellation_requests").select("*").order("created_at", { ascending: false });
};

export const processCancellation = async (id: string, action: "approved" | "rejected", adminId: string) => {
  return supabase.from("cancellation_requests").update({
    status: action, reviewed_by: adminId, reviewed_at: new Date().toISOString(),
    refund_status: action === "approved" ? "processed" : "pending",
  }).eq("id", id);
};

// ==================== Invitations ====================
export const getInvitations = async () => {
  return supabase.from("invitation_tokens").select("*").order("created_at", { ascending: false });
};

export const createInvitation = async (email: string, role: string, createdBy: string) => {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return supabase
    .from("invitation_tokens")
    .insert({ email, role, token, created_by: createdBy, expires_at: expiresAt.toISOString() })
    .select("token, role, email")
    .single();
};

// ==================== Notifications ====================
export const sendNotification = async (userIds: string[], title: string, body: string) => {
  const notifications = userIds.map((uid) => ({ user_id: uid, title, body }));
  return supabase.from("notifications").insert(notifications);
};

export const getNotifications = async () => {
  return supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
};

// ==================== Conversations ====================
export const getConversations = async () => {
  return supabase.from("conversations").select("*").order("updated_at", { ascending: false });
};

export const getMessages = async (conversationId: string) => {
  return supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
};

export const sendMessage = async (conversationId: string, senderId: string, content: string) => {
  return supabase.from("messages").insert({ conversation_id: conversationId, sender_id: senderId, content });
};

// ==================== Settings ====================
export const getAdminSettings = async () => {
  return supabase.from("admin_settings").select("*").order("key");
};

export const updateAdminSetting = async (key: string, value: string, updatedBy: string) => {
  return supabase.from("admin_settings").update({ value, updated_by: updatedBy }).eq("key", key);
};

// ==================== Privacy Policies ====================
export const getPrivacyPolicies = async () => {
  return supabase.from("privacy_policies").select("*").order("role");
};

export const upsertPrivacyPolicy = async (role: string, content: string) => {
  const { data: existing } = await supabase.from("privacy_policies").select("id").eq("role", role).maybeSingle();
  if (existing) {
    return supabase.from("privacy_policies").update({ content, version: 1, updated_at: new Date().toISOString() }).eq("id", existing.id);
  }
  return supabase.from("privacy_policies").insert({ role, content });
};

// ==================== Audit Logs ====================
export const createAuditLog = async (adminId: string, action: string, entityType?: string, entityId?: string, details?: any) => {
  return supabase.from("audit_logs").insert({ admin_id: adminId, action, entity_type: entityType, entity_id: entityId, details: details || {} });
};

export const getAuditLogs = async () => {
  return supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
};

// ==================== Dashboard Stats (Enhanced) ====================
export const getDashboardStats = async () => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

  const [
    profiles, roles, pendingApprovals, trips, deliveries,
    financialTxAll, financialTxToday, financialTxWeek, financialTxMonth,
    pendingInvoices, overdueInvoices,
    unreadSupport, joinRequests,
    recentTx, recentSupport, recentInvoices, recentUsers,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("user_roles").select("role"),
    supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("trips").select("id", { count: "exact", head: true }),
    supabase.from("deliveries").select("id", { count: "exact", head: true }),
    // All financial transactions
    supabase.from("financial_transactions").select("amount, platform_commission, partner_earning, transaction_type, created_at"),
    // Today
    supabase.from("financial_transactions").select("id", { count: "exact", head: true }).gte("created_at", todayStr),
    // Week
    supabase.from("financial_transactions").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
    // Month
    supabase.from("financial_transactions").select("id", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
    // Pending invoices
    supabase.from("partner_invoices").select("id, total_commission", { count: "exact" }).eq("status", "pending"),
    // Overdue invoices
    supabase.from("partner_invoices").select("id, total_commission", { count: "exact" }).eq("status", "overdue"),
    // Unread support
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "open"),
    // Join requests
    supabase.from("partner_join_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    // Recent transactions (last 10)
    supabase.from("financial_transactions").select("id, transaction_type, amount, platform_commission, partner_id, created_at, payment_status, partner_name").order("created_at", { ascending: false }).limit(10),
    // Recent support messages (last 5 open)
    supabase.from("conversations").select("id, subject, user_id, created_at, status").eq("status", "open").order("created_at", { ascending: false }).limit(5),
    // Recent invoices (last 5 pending/overdue)
    supabase.from("partner_invoices").select("id, invoice_number, partner_id, total_commission, due_date, status").in("status", ["pending", "overdue"]).order("due_date", { ascending: true }).limit(5),
    // Recent users (last 5)
    supabase.from("profiles").select("user_id, full_name, phone, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const rolesData = roles.data || [];
  const totals = {
    profiles: profiles.count || 0,
    pendingApprovals: pendingApprovals.count || 0,
    trips: trips.count || 0,
    deliveries: deliveries.count || 0,
    txToday: financialTxToday.count || 0,
    txWeek: financialTxWeek.count || 0,
    txMonth: financialTxMonth.count || 0,
    pendingInvoiceCount: pendingInvoices.count || 0,
    overdueInvoiceCount: overdueInvoices.count || 0,
    unreadSupport: unreadSupport.count || 0,
    joinRequests: joinRequests.count || 0,
  };
  const allTx = financialTxAll.data || [];
  const totalRevenue = allTx.reduce((s, t) => s + Number(t.amount || 0), 0);
  const platformEarnings = allTx.reduce((s, t) => s + Number(t.platform_commission || 0), 0);

  // Transaction type distribution
  const typeDistribution = [
    { name: "حجز", value: allTx.filter(t => t.transaction_type === "booking").length },
    { name: "طرد", value: allTx.filter(t => t.transaction_type === "shipment").length },
    { name: "توصيل", value: allTx.filter(t => t.transaction_type === "delivery").length },
    { name: "أجرة", value: allTx.filter(t => t.transaction_type === "ride").length },
  ];

  // 30-day chart data
  const dailyMap = new Map<string, { date: string; amount: number; commission: number; count: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, { date: key, amount: 0, commission: 0, count: 0 });
  }
  allTx.forEach(tx => {
    const key = new Date(tx.created_at).toISOString().split("T")[0];
    const entry = dailyMap.get(key);
    if (entry) {
      entry.amount += Number(tx.amount || 0);
      entry.commission += Number(tx.platform_commission || 0);
      entry.count++;
    }
  });
  const dailyChartData = Array.from(dailyMap.values());

  const pendingInvoiceTotal = (pendingInvoices.data || []).reduce((s, i) => s + Number(i.total_commission || 0), 0);
  const overdueInvoiceTotal = (overdueInvoices.data || []).reduce((s, i) => s + Number(i.total_commission || 0), 0);

  return {
    totalUsers: totals.profiles,
    customers: rolesData.filter(r => r.role === "customer").length,
    suppliers: rolesData.filter(r => r.role === "supplier").length,
    deliveryCompanies: rolesData.filter(r => r.role === "delivery_company").length,
    drivers: rolesData.filter(r => r.role === "driver").length,
    pendingApprovals: totals.pendingApprovals,
    totalTrips: totals.trips,
    totalDeliveries: totals.deliveries,
    totalRevenue,
    platformEarnings,
    txToday: totals.txToday,
    txWeek: totals.txWeek,
    txMonth: totals.txMonth,
    pendingInvoiceCount: totals.pendingInvoiceCount,
    overdueInvoiceCount: totals.overdueInvoiceCount,
    pendingInvoiceTotal,
    overdueInvoiceTotal,
    unreadSupport: totals.unreadSupport,
    joinRequests: totals.joinRequests,
    typeDistribution,
    dailyChartData,
    recentTransactions: recentTx.data || [],
    recentSupport: recentSupport.data || [],
    recentInvoices: recentInvoices.data || [],
    recentUsers: recentUsers.data || [],
  };
};
