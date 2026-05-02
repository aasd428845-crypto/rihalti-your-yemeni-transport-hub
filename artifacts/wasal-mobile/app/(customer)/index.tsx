import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, RefreshControl, Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const PRIMARY = "#0c7d4a";
const ACCENT = "#f59e0b";
const BG = "#f7f5f0";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";
const MUTED = "#9ca3af";
const FG = "#1b2d45";

const W = Dimensions.get("window").width;

const DEFAULT_BANNERS = [
  { id: "d1", title: "اطلب من مطاعمك المفضلة", subtitle: "توصيل سريع لباب منزلك", image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80&fit=crop", badge_text: "جديد", link: "restaurants" },
  { id: "d2", title: "خدمات توصيل وشحن", subtitle: "مناديب لتوصيل طرودك في أسرع وقت", image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80&fit=crop", badge_text: "متاح الآن", link: "shipment" },
  { id: "d3", title: "عروض حصرية كل يوم", subtitle: "لا تفوّت أفضل الأسعار", image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80&fit=crop", badge_text: "عرض محدود", link: "restaurants" },
];

const DEFAULT_OFFERS = [
  { id: "o1", title: "خصم 20% على أول طلب", subtitle: "لعملاء وصال الجدد", image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&fit=crop", badge_text: "عرض خاص" },
  { id: "o2", title: "توصيل مجاني", subtitle: "عند الطلب فوق 2000 ر.ي", image_url: "https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=600&q=80&fit=crop", badge_text: "مجاني" },
  { id: "o3", title: "وجبات البرجر المميزة", subtitle: "أقل سعر في المدينة", image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop", badge_text: "تخفيض" },
];

const DEFAULT_TILES = [
  { key: "food", label: "مطاعم وتوصيل", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&fit=crop" },
  { key: "grocery", label: "بقالة وتسوق", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&fit=crop" },
  { key: "pharmacy", label: "صيدليات", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80&fit=crop" },
  { key: "more", label: "المزيد", img: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=600&q=80&fit=crop" },
];

const FEATURES = [
  { icon: "zap" as const, label: "توصيل سريع", color: ACCENT },
  { icon: "shield" as const, label: "دفع آمن", color: PRIMARY },
  { icon: "star" as const, label: "تقييمات موثوقة", color: "#f97316" },
  { icon: "trending-up" as const, label: "أسعار تنافسية", color: "#3b82f6" },
];

const BANNER_H = Math.round((W - 32) * 0.5);
const TILE_H = 90;

function BannerCarousel({ banners, onPress }: { banners: any[]; onPress: (b: any) => void }) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (banners.length <= 1) return;
    timer.current = setInterval(() => setIdx(i => (i + 1) % banners.length), 4500);
    return () => { if (timer.current !== undefined) clearInterval(timer.current); };
  }, [banners.length]);

  if (!banners.length) return null;
  const b = banners[idx];

  return (
    <View style={styles.bannerBox}>
      <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(b)} style={{ flex: 1 }}>
        <Image source={{ uri: b.image_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View style={styles.bannerOverlay} />
        {b.badge_text && (
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>{b.badge_text}</Text>
          </View>
        )}
        <View style={styles.bannerTextBox}>
          {b.title && <Text style={styles.bannerTitle}>{b.title}</Text>}
          {b.subtitle && <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>}
        </View>
      </TouchableOpacity>
      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => {
              if (timer.current !== undefined) clearInterval(timer.current);
              setIdx(i);
            }}>
              <View style={[styles.dot, i === idx && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function ItemCard({ item, onPress }: { item: any; onPress: () => void }) {
  const price = item.discounted_price ?? item.price;
  const hasDiscount = item.discounted_price && item.discounted_price < item.price;
  const rating = Number(item.rating || 0);
  return (
    <TouchableOpacity style={styles.itemCard} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.itemImgBox}>
        <Image
          source={{ uri: item.image_url || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80" }}
          style={styles.itemImg}
          resizeMode="cover"
        />
        <View style={styles.itemRating}>
          <Feather name="star" size={9} color="#fbbf24" />
          <Text style={styles.itemRatingText}>{rating > 0 ? rating.toFixed(1) : "جديد"}</Text>
        </View>
        {hasDiscount && <View style={styles.itemDiscount}><Text style={styles.itemDiscountText}>خصم</Text></View>}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name_ar}</Text>
        {item.restaurants?.name_ar && <Text style={styles.itemRest} numberOfLines={1}>{item.restaurants.name_ar}</Text>}
        <View style={styles.itemPriceRow}>
          <Text style={styles.itemPrice}>{Number(price).toLocaleString("ar-YE")} ر.ي</Text>
          {hasDiscount && <Text style={styles.itemOld}>{Number(item.price).toLocaleString("ar-YE")}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CustomerHome() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [banners, setBanners] = useState<any[]>(DEFAULT_BANNERS);
  const [offers, setOffers] = useState<any[]>(DEFAULT_OFFERS);
  const [tiles, setTiles] = useState<any[]>(DEFAULT_TILES);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const load = async () => {
    const [bannersRes, itemsRes, featRes, catsRes] = await Promise.all([
      supabase.from("delivery_banners" as any).select("*").eq("is_active", true).order("sort_order"),
      supabase.from("menu_items").select("id,name_ar,image_url,price,discounted_price,rating,total_ratings,restaurant_id,restaurants(name_ar)").eq("is_available", true).order("rating", { ascending: false }).limit(10),
      supabase.from("menu_items").select("id,name_ar,image_url,price,discounted_price,rating,restaurant_id,restaurants(name_ar)").eq("is_featured", true).eq("is_available", true).limit(10),
      supabase.from("restaurant_cuisines" as any).select("id,name_ar,image_url").eq("is_active", true).order("sort_order").limit(10),
    ]);

    if (bannersRes.data && bannersRes.data.length > 0) {
      const d = bannersRes.data;
      const carousel = d.filter((b: any) => !b.banner_type || b.banner_type === "carousel");
      const offersData = d.filter((b: any) => b.banner_type === "offer");
      const tilesData = d.filter((b: any) => b.banner_type === "service_tile");
      if (carousel.length) setBanners(carousel);
      if (offersData.length) setOffers(offersData);
      if (tilesData.length) setTiles(tilesData);
    }
    if (itemsRes.data) setTopItems(itemsRes.data);
    if (featRes.data) setFeaturedItems(featRes.data);
    if (catsRes.data) setCategories(catsRes.data);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleTilePress = (tile: any) => {
    const action = tile.tile_action || tile.action || tile.key || "food";
    if (action === "food" || action === "restaurants") router.push("/(customer)/restaurants");
    else router.push("/(customer)/more");
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 90 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreet}>مرحباً {profile?.full_name?.split(" ")[0] || ""}! 👋</Text>
          <Text style={styles.headerSub}>ماذا تريد اليوم؟</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(customer)/notifications")} style={styles.headerBell}>
          <Feather name="bell" size={20} color={FG} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Service Tiles 2x2 */}
        <View style={styles.tilesGrid}>
          {tiles.map((tile: any, i: number) => (
            <TouchableOpacity key={tile.id || tile.key || i} style={styles.tile} activeOpacity={0.85} onPress={() => handleTilePress(tile)}>
              <Image source={{ uri: tile.image_url || tile.img || "" }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <View style={styles.tileOverlay} />
              <View style={styles.tileLabelBox}>
                <Text style={styles.tileLabel}>{tile.title || tile.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner Carousel */}
        <BannerCarousel banners={banners} onPress={(b) => b.link === "restaurants" && router.push("/(customer)/restaurants")} />

        {/* Offers Section */}
        {offers.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Feather name="tag" size={14} color="#ef4444" />
              <Text style={styles.sectionTitle}>عروض وخصومات</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {offers.map((o: any) => (
                <TouchableOpacity key={o.id} style={styles.offerCard} activeOpacity={0.85}>
                  <Image source={{ uri: o.image_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  <View style={styles.bannerOverlay} />
                  {o.badge_text && <View style={[styles.bannerBadge, { backgroundColor: "#ef4444" }]}><Text style={styles.bannerBadgeText}>{o.badge_text}</Text></View>}
                  <View style={[styles.bannerTextBox, { padding: 8 }]}>
                    {o.title && <Text style={[styles.bannerTitle, { fontSize: 11 }]} numberOfLines={1}>{o.title}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>الأصناف</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {categories.map((cat: any) => (
                <TouchableOpacity key={cat.id} style={styles.catItem} activeOpacity={0.8} onPress={() => router.push("/(customer)/restaurants")}>
                  <View style={styles.catImgBox}>
                    {cat.image_url
                      ? <Image source={{ uri: cat.image_url }} style={styles.catImg} resizeMode="cover" />
                      : <View style={[styles.catImg, { backgroundColor: "#e8f5ee", justifyContent: "center", alignItems: "center" }]}><Feather name="coffee" size={22} color={PRIMARY} /></View>
                    }
                  </View>
                  <Text style={styles.catLabel} numberOfLines={1}>{cat.name_ar}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Top Rated Items */}
        {topItems.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Feather name="trending-up" size={14} color={PRIMARY} />
              <Text style={styles.sectionTitle}>الأكثر تقييماً</Text>
              <TouchableOpacity onPress={() => router.push("/(customer)/restaurants")} style={styles.seeAll}>
                <Text style={styles.seeAllText}>عرض الكل</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {topItems.map((item: any) => (
                <ItemCard key={item.id} item={item} onPress={() => router.push("/(customer)/restaurants")} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Delivery CTA */}
        <TouchableOpacity style={styles.deliveryCta} activeOpacity={0.85} onPress={() => router.push("/(customer)/orders")}>
          <Feather name="package" size={20} color="#fff" />
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.ctaTitle}>احتاج مندوب توصيل</Text>
            <Text style={styles.ctaSubtitle}>أرسل طردك لأي مكان الآن</Text>
          </View>
          <Feather name="chevron-left" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Featured Items */}
        {featuredItems.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Feather name="star" size={14} color={ACCENT} />
              <Text style={styles.sectionTitle}>مختارات لك</Text>
              <TouchableOpacity onPress={() => router.push("/(customer)/restaurants")} style={styles.seeAll}>
                <Text style={styles.seeAllText}>عرض الكل</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {featuredItems.map((item: any) => (
                <ItemCard key={item.id} item={item} onPress={() => router.push("/(customer)/restaurants")} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Feature Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featurePill}>
              <Feather name={f.icon} size={12} color={f.color} />
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[{ num: "+500", label: "مطعم" }, { num: "+20", label: "مدينة" }, { num: "4.9 ⭐", label: "تقييم" }].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* More Button */}
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.85} onPress={() => router.push("/(customer)/more")}>
          <Feather name="menu" size={18} color={PRIMARY} />
          <Text style={styles.moreBtnText}>المزيد من الخيارات</Text>
          <Feather name="chevron-left" size={16} color={PRIMARY} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  headerGreet: { fontSize: 20, fontWeight: "700", color: FG, textAlign: "right" },
  headerSub: { fontSize: 13, color: MUTED, textAlign: "right", marginTop: 2 },
  headerBell: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  content: { paddingHorizontal: 16, gap: 16 },

  tilesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: (W - 42) / 2, height: TILE_H, borderRadius: 14, overflow: "hidden" },
  tileOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
  tileLabelBox: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, alignItems: "center" },
  tileLabel: { color: "#fff", fontWeight: "700", fontSize: 14, textAlign: "center", textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  bannerBox: { height: BANNER_H, borderRadius: 14, overflow: "hidden" },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  bannerBadge: { position: "absolute", top: 10, right: 10, backgroundColor: ACCENT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  bannerBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  bannerTextBox: { position: "absolute", bottom: 28, left: 12, right: 12 },
  bannerTitle: { color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "right", textShadowColor: "rgba(0,0,0,0.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  bannerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "right", marginTop: 3 },
  dots: { position: "absolute", bottom: 8, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { width: 18, backgroundColor: "#fff" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: FG, flex: 1, textAlign: "right" },
  seeAll: { marginLeft: "auto" },
  seeAllText: { fontSize: 12, color: PRIMARY, fontWeight: "600" },

  hScroll: { marginHorizontal: -16, paddingHorizontal: 16 },

  offerCard: { width: 130, height: 72, borderRadius: 12, overflow: "hidden", marginLeft: 8 },

  catItem: { alignItems: "center", marginLeft: 12, width: 72 },
  catImgBox: { width: 60, height: 60, borderRadius: 30, overflow: "hidden", borderWidth: 2, borderColor: BORDER },
  catImg: { width: 60, height: 60 },
  catLabel: { fontSize: 11, fontWeight: "600", color: FG, marginTop: 5, textAlign: "center" },

  itemCard: { width: 140, backgroundColor: CARD, borderRadius: 12, overflow: "hidden", marginLeft: 8, borderWidth: 1, borderColor: BORDER, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  itemImgBox: { width: 140, height: 90, backgroundColor: "#f3f4f6" },
  itemImg: { width: 140, height: 90 },
  itemRating: { position: "absolute", bottom: 6, right: 6, backgroundColor: PRIMARY, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 2 },
  itemRatingText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  itemDiscount: { position: "absolute", bottom: 6, left: 6, backgroundColor: "#ef4444", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  itemDiscountText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  itemInfo: { padding: 8 },
  itemName: { fontSize: 12, fontWeight: "700", color: FG, textAlign: "right" },
  itemRest: { fontSize: 10, color: MUTED, textAlign: "right", marginTop: 2 },
  itemPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 },
  itemPrice: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  itemOld: { fontSize: 10, color: MUTED, textDecorationLine: "line-through" },

  deliveryCta: { backgroundColor: PRIMARY, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  ctaTitle: { color: "#fff", fontWeight: "700", fontSize: 15, textAlign: "right" },
  ctaSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2, textAlign: "right" },

  featurePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8, borderWidth: 1, borderColor: BORDER },
  featureLabel: { fontSize: 11, fontWeight: "600", color: FG },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  statNum: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  statLabel: { fontSize: 10, color: MUTED, marginTop: 2 },

  moreBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: PRIMARY + "33" },
  moreBtnText: { flex: 1, fontSize: 14, fontWeight: "600", color: PRIMARY, textAlign: "center" },
});
