import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, RefreshControl, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

const PRIMARY = "#0c7d4a";
const ACCENT = "#f59e0b";
const BG = "#f7f5f0";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";
const MUTED = "#9ca3af";
const FG = "#1b2d45";

const FALLBACK_IMAGES: Record<string, string> = {
  "يمني": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80&fit=crop",
  "برجر": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80&fit=crop",
  "بيتزا": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80&fit=crop",
  "شاورما": "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400&q=80&fit=crop",
  "دجاج": "https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=400&q=80&fit=crop",
  "مشروبات": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80&fit=crop",
  "حلويات": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80&fit=crop",
  "default": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80&fit=crop",
};

function getRestImg(r: any) {
  if (r.cover_image) return r.cover_image;
  if (r.cover_image_url) return r.cover_image_url;
  if (r.logo_url) return r.logo_url;
  const c = Array.isArray(r.cuisine_type) ? r.cuisine_type[0] || "" : "";
  return FALLBACK_IMAGES[c] || FALLBACK_IMAGES["default"];
}

function RestaurantCard({ r }: { r: any }) {
  const heroSrc = getRestImg(r);
  const rating = Number(r.rating || 0);
  const deliveryFee = r.delivery_fee ?? 0;
  const deliveryTime = r.estimated_delivery_time;
  const isOpen = r.is_active !== false;
  const hasDiscount = !!r.has_active_offer || (Number(r.discount_percent) > 0);

  return (
    <View style={styles.restCard}>
      <View style={styles.restImgBox}>
        <Image source={{ uri: heroSrc }} style={styles.restImg} resizeMode="cover" />
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>خصم {r.discount_percent || 20}%</Text>
          </View>
        )}
        {r.is_featured && (
          <View style={styles.featuredBadge}>
            <Feather name="star" size={10} color="#fff" />
            <Text style={styles.featuredText}>مميز</Text>
          </View>
        )}
        {!isOpen && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>مغلق</Text>
          </View>
        )}
      </View>
      <View style={styles.restInfo}>
        <Text style={styles.restName} numberOfLines={1}>{r.name_ar}</Text>
        {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
          <Text style={styles.restCuisine} numberOfLines={1}>{r.cuisine_type.slice(0, 3).join(" · ")}</Text>
        )}
        <View style={styles.restMeta}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={11} color={MUTED} />
            <Text style={styles.metaText}>{deliveryTime ? `${deliveryTime} د` : "20-35 د"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="truck" size={11} color={deliveryFee === 0 ? PRIMARY : MUTED} />
            <Text style={[styles.metaText, deliveryFee === 0 && { color: PRIMARY, fontWeight: "600" }]}>
              {deliveryFee === 0 ? "مجاني" : `${deliveryFee} ر.ي`}
            </Text>
          </View>
          <View style={styles.ratingPill}>
            <Feather name="star" size={10} color={ACCENT} />
            <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : "جديد"}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.restCard, { opacity: 0.4 }]}>
      <View style={[styles.restImgBox, { backgroundColor: "#e5e7eb" }]} />
      <View style={styles.restInfo}>
        <View style={{ height: 14, backgroundColor: "#e5e7eb", borderRadius: 6, width: "70%", marginBottom: 8 }} />
        <View style={{ height: 11, backgroundColor: "#e5e7eb", borderRadius: 6, width: "50%", marginBottom: 8 }} />
        <View style={{ height: 11, backgroundColor: "#e5e7eb", borderRadius: 6, width: "80%" }} />
      </View>
    </View>
  );
}

export default function RestaurantsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const [restRes, catRes] = await Promise.all([
      supabase
        .from("restaurants")
        .select("id, name_ar, logo_url, cover_image, cover_image_url, cuisine_type, rating, delivery_fee, estimated_delivery_time, is_active, is_featured, has_active_offer, discount_percent")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("rating", { ascending: false })
        .limit(60),
      supabase.from("restaurant_cuisines" as any).select("id, name_ar").eq("is_active", true).order("sort_order").limit(12),
    ]);
    setRestaurants(restRes.data || []);
    setCategories(catRes.data || []);
    setLoading(false);
  }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  useEffect(() => { load(); }, [load]);

  const filtered = restaurants.filter(r => {
    const matchSearch = !search || (r.name_ar || "").includes(search);
    const matchFilter = filter === "all" || (Array.isArray(r.cuisine_type) && r.cuisine_type.includes(filter));
    return matchSearch && matchFilter;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-right" size={22} color={FG} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المطاعم والطلبات</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color={MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن مطعم..."
          placeholderTextColor={MUTED}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={MUTED} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <FlatList
          horizontal
          data={[{ id: "all", name_ar: "الكل" }, ...categories]}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === (item.id === "all" ? "all" : item.name_ar) && styles.filterChipActive]}
              onPress={() => setFilter(item.id === "all" ? "all" : (filter === item.name_ar ? "all" : item.name_ar))}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterLabel, filter === (item.id === "all" ? "all" : item.name_ar) && styles.filterLabelActive]}>
                {item.id === "all" ? "🍽️ الكل" : item.name_ar}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Count */}
      {!loading && (
        <Text style={styles.countText}>{filtered.length} مطعم</Text>
      )}

      {/* List */}
      {loading ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={i => String(i)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <RestaurantCard r={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="search" size={44} color="#d1d5db" />
              <Text style={styles.emptyText}>لا توجد مطاعم تطابق البحث</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, backgroundColor: CARD, borderBottomWidth: 1, borderColor: BORDER },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: FG },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, fontSize: 14, color: FG, height: 24 },
  filterRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterLabel: { fontSize: 13, fontWeight: "600", color: FG },
  filterLabelActive: { color: "#fff" },
  countText: { fontSize: 12, color: MUTED, textAlign: "right", paddingHorizontal: 16, paddingBottom: 6 },
  list: { padding: 12, gap: 10, flexGrow: 1 },
  restCard: { flexDirection: "row", backgroundColor: CARD, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  restImgBox: { width: 100, height: 100, flexShrink: 0, backgroundColor: "#f3f4f6" },
  restImg: { width: 100, height: 100 },
  discountBadge: { position: "absolute", top: 5, right: 5, backgroundColor: "#ef4444", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  discountText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  featuredBadge: { position: "absolute", bottom: 5, right: 5, backgroundColor: ACCENT, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 3 },
  featuredText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  closedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  closedText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  restInfo: { flex: 1, padding: 12, justifyContent: "space-between" },
  restName: { fontSize: 15, fontWeight: "700", color: FG, textAlign: "right", marginBottom: 3 },
  restCuisine: { fontSize: 11, color: MUTED, textAlign: "right", marginBottom: 8 },
  restMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: MUTED },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fef3c7", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: "auto" },
  ratingText: { fontSize: 11, fontWeight: "700", color: "#92400e" },
  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: MUTED },
});
