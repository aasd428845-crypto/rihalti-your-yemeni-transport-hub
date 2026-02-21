import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/admin.types";

// ==================== Users ====================
export const getUsers = async () => {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, phone, city, avatar_url, created_at"),
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
    status: "approved",
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  }).eq("id", id);
};

export const rejectRequest = async (id: string, adminId: string, notes?: string) => {
  return supabase.from("approval_requests").update({
    status: "rejected",
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
    admin_notes: notes || null,
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
    status,
    paid_at: status === "paid" ? new Date().toISOString() : null,
  }).eq("id", id);
};

// ==================== Cancellations ====================
export const getCancellationRequests = async () => {
  return supabase.from("cancellation_requests").select("*").order("created_at", { ascending: false });
};

export const processCancellation = async (id: string, action: "approved" | "rejected", adminId: string) => {
  return supabase.from("cancellation_requests").update({
    status: action,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
    refund_status: action === "approved" ? "processed" : "pending",
  }).eq("id", id);
};

// ==================== Invitations ====================
export const getInvitations = async () => {
  return supabase.from("invitation_tokens").select("*").order("created_at", { ascending: false });
};

export const createInvitation = async (email: string, role: string, createdBy: string) => {
  return supabase.from("invitation_tokens").insert({
    email,
    role,
    created_by: createdBy,
  });
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

// ==================== Dashboard Stats ====================
export const getDashboardStats = async () => {
  const [profiles, roles, pendingApprovals, trips, shipments, deliveries, transactions] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("user_roles").select("role"),
    supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("trips").select("id", { count: "exact", head: true }),
    supabase.from("shipments").select("id", { count: "exact", head: true }),
    supabase.from("deliveries").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("amount, platform_fee, status"),
  ]);

  const rolesData = roles.data || [];
  const txData = transactions.data || [];
  const completedTx = txData.filter((t) => t.status === "completed");

  return {
    totalUsers: profiles.count || 0,
    suppliers: rolesData.filter((r) => r.role === "supplier").length,
    deliveryCompanies: rolesData.filter((r) => r.role === "delivery_company").length,
    pendingApprovals: pendingApprovals.count || 0,
    totalTrips: trips.count || 0,
    totalShipments: shipments.count || 0,
    totalDeliveries: deliveries.count || 0,
    totalRevenue: completedTx.reduce((s, t) => s + Number(t.amount), 0),
    platformEarnings: completedTx.reduce((s, t) => s + Number(t.platform_fee), 0),
  };
};
