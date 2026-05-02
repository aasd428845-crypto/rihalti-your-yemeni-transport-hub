import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, TextInput, Modal, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const PRIMARY = "#0c7d4a";
const BG = "#f7f5f0";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";
const MUTED = "#9ca3af";
const FG = "#1b2d45";

type TabKey = "shipments" | "deliveries" | "bookings" | "rides";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "shipments", label: "الطرود", icon: "package" },
  { key: "deliveries", label: "التوصيلات", icon: "shopping-bag" },
  { key: "bookings", label: "الرحلات", icon: "navigation" },
  { key: "rides", label: "الأجرة", icon: "car" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "#f59e0b" },
  pending_approval: { label: "بانتظار الموافقة", color: "#f59e0b" },
  pending_pricing: { label: "بانتظار التسعير", color: "#f97316" },
  priced: { label: "تم التسعير", color: "#6366f1" },
  confirmed: { label: "مؤكد", color: "#3b82f6" },
  accepted: { label: "مقبول", color: "#16a34a" },
  offered: { label: "عرض سعر", color: "#d97706" },
  preparing: { label: "جاري التحضير", color: "#8b5cf6" },
  assigned: { label: "تم التعيين", color: "#7c3aed" },
  driver_assigned: { label: "تم تعيين سائق", color: "#7c3aed" },
  picked_up: { label: "تم الاستلام", color: "#0891b2" },
  on_the_way: { label: "في الطريق", color: "#0d9488" },
  in_progress: { label: "قيد التنفيذ", color: "#3b82f6" },
  delivered: { label: "تم التوصيل", color: "#16a34a" },
  completed: { label: "مكتمل", color: "#16a34a" },
  cancelled: { label: "ملغي", color: "#dc2626" },
  rejected: { label: "مرفوض", color: "#dc2626" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, color: MUTED };
  return (
    <View style={[styles.badge, { backgroundColor: s.color + "20" }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function CancelModal({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: (r: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>سبب الإلغاء</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="يرجى ذكر سبب الإلغاء..."
            placeholderTextColor={MUTED}
            value={reason}
            onChangeText={setReason}
            textAlign="right"
            multiline
            numberOfLines={3}
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, !reason.trim() && { opacity: 0.5 }]}
              disabled={!reason.trim()}
              onPress={() => { onConfirm(reason.trim()); setReason(""); }}
            >
              <Text style={styles.modalConfirmText}>تأكيد الإلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OrderCard({ item, type, onCancel }: { item: any; type: TabKey; onCancel?: () => void }) {
  const canCancel = ["pending", "confirmed", "pending_approval"].includes(item.status);
  const hasPriceOffer = item.proposed_price && (item.negotiation_status === "offered" || item.status === "priced");

  let mainText = "";
  let subText = "";
  let amount = "";

  if (type === "shipments") {
    mainText = `${item.pickup_address || "?"} ← ${item.delivery_address || "?"}`;
    subText = item.shipment_type === "door_to_door" ? "باب لباب" : "مكتب لمكتب";
    amount = item.final_price || item.proposed_price || item.price;
  } else if (type === "deliveries") {
    mainText = `${item.pickup_address || "?"} ← ${item.dropoff_address || "?"}`;
    subText = item.description || "";
    amount = item.final_price || item.proposed_price;
  } else if (type === "bookings") {
    mainText = `${item.trip?.from_city || "?"} ← ${item.trip?.to_city || "?"}`;
    subText = `${item.seat_count || 1} مقعد`;
    amount = item.total_amount;
  } else if (type === "rides") {
    mainText = `${item.from_location || "?"} ← ${item.to_location || "?"}`;
    subText = "";
    amount = item.final_price || item.proposed_price;
  }

  return (
    <View style={[styles.orderCard, hasPriceOffer && !item.customer_accepted && styles.offerCard]}>
      {hasPriceOffer && !item.customer_accepted && (
        <View style={styles.offerBanner}>
          <Feather name="dollar-sign" size={13} color="#d97706" />
          <Text style={styles.offerBannerText}>عرض سعر: {item.proposed_price} ر.ي — اقبل أو ارفض</Text>
        </View>
      )}
      <View style={styles.orderRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.orderTitleRow}>
            <Feather name={TABS.find(t => t.key === type)?.icon || "package"} size={15} color={PRIMARY} />
            <Text style={styles.orderMain} numberOfLines={1}>{mainText}</Text>
          </View>
          {subText ? <Text style={styles.orderSub}>{subText}</Text> : null}
          <View style={styles.orderMeta}>
            <StatusBadge status={item.status} />
            <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString("ar-YE", { day: "numeric", month: "short" })}</Text>
          </View>
        </View>
        <View style={styles.orderRight}>
          {amount ? <Text style={styles.orderAmount}>{Number(amount).toLocaleString()} ر.ي</Text> : null}
          {canCancel && onCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Feather name="x-circle" size={14} color="#dc2626" />
              <Text style={styles.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function EmptyTab({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.emptyBox}>
      <Feather name={icon} size={44} color="#d1d5db" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("shipments");
  const [data, setData] = useState<Record<TabKey, any[]>>({ shipments: [], deliveries: [], bookings: [], rides: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ visible: boolean; type: string; id: string }>({ visible: false, type: "", id: "" });

  const load = useCallback(async () => {
    if (!user) return;
    const [sh, de, bo, ri] = await Promise.all([
      supabase.from("shipment_requests").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("delivery_orders").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("bookings").select("*, trip:trips(from_city,to_city,departure_time)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("ride_requests").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);
    setData({
      shipments: sh.data || [],
      deliveries: de.data || [],
      bookings: bo.data || [],
      rides: ri.data || [],
    });
    setLoading(false);
  }, [user]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  const openCancelModal = (type: string, id: string) => {
    setCancelModal({ visible: true, type, id });
  };

  const handleCancelConfirm = async (reason: string) => {
    setCancelModal(m => ({ ...m, visible: false }));
    await supabase.from("cancellation_requests" as any).insert({
      user_id: user?.id, entity_type: cancelModal.type, entity_id: cancelModal.id, reason,
    });
    load();
  };

  const current = data[activeTab];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>طلباتي وسجلي</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Feather name={tab.icon} size={14} color={activeTab === tab.key ? PRIMARY : MUTED} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            {data[tab.key].some((i: any) => i.negotiation_status === "offered" || i.status === "priced") && (
              <View style={styles.dot} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={current}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              item={item}
              type={activeTab}
              onCancel={() => openCancelModal(
                activeTab === "shipments" ? "shipment" :
                activeTab === "deliveries" ? "delivery" :
                activeTab === "bookings" ? "booking" : "ride",
                item.id
              )}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
          ListEmptyComponent={
            <EmptyTab
              icon={TABS.find(t => t.key === activeTab)?.icon || "inbox"}
              text={`لا يوجد ${TABS.find(t => t.key === activeTab)?.label || "طلبات"}`}
            />
          }
        />
      )}

      <CancelModal
        visible={cancelModal.visible}
        onClose={() => setCancelModal(m => ({ ...m, visible: false }))}
        onConfirm={handleCancelConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  headerTitle: { fontSize: 20, fontWeight: "700", color: FG, textAlign: "right" },
  tabs: { flexDirection: "row", backgroundColor: CARD, borderBottomWidth: 1, borderColor: BORDER, paddingHorizontal: 8 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12, borderBottomWidth: 2, borderColor: "transparent" },
  tabActive: { borderColor: PRIMARY },
  tabLabel: { fontSize: 12, fontWeight: "600", color: MUTED },
  tabLabelActive: { color: PRIMARY },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444" },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  orderCard: { backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  offerCard: { borderColor: "#fbbf24", shadowColor: "#f59e0b", shadowOpacity: 0.15 },
  offerBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fef3c7", borderRadius: 8, padding: 8, marginBottom: 10 },
  offerBannerText: { fontSize: 12, color: "#92400e", fontWeight: "600", flex: 1, textAlign: "right" },
  orderRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  orderTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  orderMain: { fontSize: 14, fontWeight: "600", color: FG, flex: 1, textAlign: "right" },
  orderSub: { fontSize: 12, color: MUTED, textAlign: "right", marginBottom: 6 },
  orderMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  orderDate: { fontSize: 11, color: MUTED },
  orderRight: { alignItems: "flex-end", gap: 8 },
  orderAmount: { fontSize: 15, fontWeight: "700", color: PRIMARY },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#fca5a5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cancelText: { fontSize: 12, color: "#dc2626", fontWeight: "600" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: MUTED },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: FG, textAlign: "center", marginBottom: 16 },
  modalInput: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: FG, minHeight: 70, textAlignVertical: "top", marginBottom: 16 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, backgroundColor: BG, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: MUTED },
  modalConfirmBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, backgroundColor: "#dc2626", alignItems: "center" },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
