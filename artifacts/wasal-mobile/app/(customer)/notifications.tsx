import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
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

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  type?: string;
}

function NotifIcon({ type }: { type?: string }) {
  let icon: any = "bell";
  let color = PRIMARY;
  if (type === "order") { icon = "shopping-bag"; color = "#3b82f6"; }
  else if (type === "delivery") { icon = "truck"; color = "#8b5cf6"; }
  else if (type === "promo") { icon = "tag"; color = "#f59e0b"; }
  else if (type === "alert") { icon = "alert-circle"; color = "#ef4444"; }
  return (
    <View style={[styles.notifIcon, { backgroundColor: color + "15" }]}>
      <Feather name={icon} size={18} color={color} />
    </View>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("notifications" as any)
      .select("id, title, body, is_read, created_at, type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifs((data || []) as Notification[]);
    setLoading(false);
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications" as any).update({ is_read: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications" as any).update({ is_read: true }).eq("user_id", user.id);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [user]);

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>الإشعارات</Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread}</Text>
            </View>
          )}
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>تعليم الكل مقروء</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifCard, !item.is_read && styles.notifUnread]}
              activeOpacity={0.8}
              onPress={() => markRead(item.id)}
            >
              <NotifIcon type={item.type} />
              <View style={styles.notifContent}>
                <View style={styles.notifTopRow}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  {!item.is_read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifDate}>
                  {new Date(item.created_at).toLocaleDateString("ar-YE", { day: "numeric", month: "long" })}
                  {" "}
                  {new Date(item.created_at).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="bell-off" size={44} color="#d1d5db" />
              <Text style={styles.emptyText}>لا يوجد إشعارات</Text>
              <Text style={styles.emptySubtext}>ستظهر هنا إشعاراتك وتحديثات طلباتك</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: CARD, borderBottomWidth: 1, borderColor: BORDER },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: FG },
  unreadBadge: { backgroundColor: "#ef4444", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  markAllText: { fontSize: 13, color: PRIMARY, fontWeight: "600" },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  notifCard: { flexDirection: "row", gap: 12, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  notifUnread: { backgroundColor: "#f0fdf4", borderColor: PRIMARY + "40" },
  notifIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  notifContent: { flex: 1 },
  notifTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  notifTitle: { fontSize: 14, fontWeight: "700", color: FG, flex: 1, textAlign: "right" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY, flexShrink: 0 },
  notifBody: { fontSize: 13, color: MUTED, textAlign: "right", lineHeight: 19, marginBottom: 6 },
  notifDate: { fontSize: 11, color: "#c0c4cc", textAlign: "right" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600", color: MUTED },
  emptySubtext: { fontSize: 13, color: "#c0c4cc", textAlign: "center" },
});
