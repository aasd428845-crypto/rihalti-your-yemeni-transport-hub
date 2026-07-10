import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, MessageCircle, FileText, Share2, ChevronDown, ChevronUp } from "lucide-react";

type RestaurantStat = {
  id: string;
  name_ar: string;
  logo_url?: string;
  totalOrders: number;
  pendingCodCount: number;
  periodOrders: number;
  totalFoodRevenue: number;
  periodFoodRevenue: number;
  pendingCodFoodRevenue: number;
  totalSubsidy: number;
  periodSubsidy: number;
  commissionRate: number;
  totalCommissionCut: number;
  periodCommissionCut: number;
  totalRevenue: number;
  periodRevenue: number;
  freeDeliveryOrdersCount: number;
  discountOrdersCount: number;
  totalDeliveryFeeRevenue: number;
  recentOrders: any[];
};

interface Props {
  restaurantStats: RestaurantStat[];
  totalRestaurantsCount: number;
  restaurantPeriod: "daily" | "weekly" | "monthly";
  setRestaurantPeriod: (v: "daily" | "weekly" | "monthly") => void;
  expandedRestaurant: string | null;
  setExpandedRestaurant: (id: string | null) => void;
  toast: any;
}

const shareViaWhatsApp = (text: string) => {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
};

const copyToClipboard = async (text: string, toastFn: any) => {
  try {
    await navigator.clipboard.writeText(text);
    toastFn({ title: "تم النسخ ✅", description: "يمكنك لصق النص في أي تطبيق" });
  } catch {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand("copy"); document.body.removeChild(el);
    toastFn({ title: "تم النسخ ✅" });
  }
};

export const RestaurantCommissionCard = ({
  restaurantStats,
  totalRestaurantsCount,
  restaurantPeriod,
  setRestaurantPeriod,
  expandedRestaurant,
  setExpandedRestaurant,
  toast,
}: Props) => {
  const buildRestaurantShareText = (r: RestaurantStat) => {
    const periodLabel = restaurantPeriod === "daily" ? "اليوم" : restaurantPeriod === "weekly" ? "هذا الأسبوع" : "هذا الشهر";
    const lines = [
      `📊 إحصائيات ${r.name_ar}`,
      ``,
      `🗓 ${periodLabel}:`,
      `  • الطلبات: ${r.periodOrders}`,
      `  • الإيرادات: ${r.periodRevenue.toLocaleString()} ر.ي`,
      ``,
      `📈 إجمالي كلي:`,
      `  • الطلبات: ${r.totalOrders}`,
      `  • الإيرادات: ${r.totalRevenue.toLocaleString()} ر.ي`,
    ];
    if (r.recentOrders.length > 0) {
      lines.push(``, `🧾 آخر ${Math.min(r.recentOrders.length, 5)} طلبات:`);
      r.recentOrders.slice(0, 5).forEach((o: any) => {
        const fee = Number(o.total || 0) - Number(o.delivery_fee || 0);
        lines.push(`  • ${o.customer_name || "—"} — ${fee.toLocaleString()} ر.ي — ${new Date(o.created_at).toLocaleDateString("ar")}`);
      });
    }
    return lines.join("\n");
  };

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          إيرادات المطاعم ({totalRestaurantsCount} مطعم)
        </h3>
        <Select value={restaurantPeriod} onValueChange={(v: any) => setRestaurantPeriod(v)}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">اليوم</SelectItem>
            <SelectItem value="weekly">هذا الأسبوع</SelectItem>
            <SelectItem value="monthly">هذا الشهر</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {restaurantStats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
            لا توجد مطاعم مضافة بعد
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {restaurantStats.map(rest => (
            <Card key={rest.id} className="overflow-hidden">
              {/* Restaurant Header */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedRestaurant(expandedRestaurant === rest.id ? null : rest.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {rest.logo_url ? (
                      <img src={rest.logo_url} alt={rest.name_ar} className="w-10 h-10 rounded-lg object-cover shrink-0 border" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold truncate">{rest.name_ar}</p>
                      <p className="text-xs text-muted-foreground">
                        {rest.periodOrders} طلب · {rest.periodRevenue.toLocaleString()} ر.ي
                        <span className="text-[10px] opacity-60">
                          {" "}({restaurantPeriod === "daily" ? "اليوم" : restaurantPeriod === "weekly" ? "الأسبوع" : "الشهر"})
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-left">
                      <p className="text-lg font-black text-primary">{rest.totalRevenue.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">إجمالي ر.ي</p>
                    </div>
                    {expandedRestaurant === rest.id
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                </div>

                {/* Summary stats row */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                  {[
                    { label: "طلبات مكتملة", val: rest.totalOrders },
                    { label: "طلبات الفترة", val: rest.periodOrders },
                    { label: "صافي الإيرادات", val: `${rest.totalRevenue.toLocaleString()} ر.ي` },
                  ].map((s, i) => (
                    <div key={i} className="text-center">
                      <p className="text-sm font-bold">{s.val}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Offer stats row */}
                {(rest.freeDeliveryOrdersCount > 0 || rest.discountOrdersCount > 0 || rest.totalDeliveryFeeRevenue > 0) && (
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-dashed">
                    <div className="text-center">
                      <p className="text-sm font-bold text-green-600">{rest.freeDeliveryOrdersCount}</p>
                      <p className="text-[10px] text-muted-foreground">توصيل مجاني</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-blue-600">{rest.discountOrdersCount}</p>
                      <p className="text-[10px] text-muted-foreground">خصم طلب</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-primary">{rest.totalDeliveryFeeRevenue.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">رسوم التوصيل ر.ي</p>
                    </div>
                  </div>
                )}

                {rest.totalSubsidy > 0 && (
                  <div className="mt-1 bg-red-50 dark:bg-red-950/20 rounded-lg px-2 py-1.5 flex items-center justify-between text-xs">
                    <span className="text-destructive font-medium flex items-center gap-1">💸 مجموع المديونية</span>
                    <span className="font-bold text-destructive">{rest.totalSubsidy.toLocaleString()} ر.ي</span>
                  </div>
                )}

                {rest.pendingCodCount > 0 && (
                  <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/20 rounded-lg px-2 py-1.5">
                    <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                      ⏳ كاش في الطريق ({rest.pendingCodCount} طلب)
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      + {rest.pendingCodFoodRevenue.toLocaleString()} ر.ي
                    </span>
                  </div>
                )}

                {rest.commissionRate > 0 && (
                  <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
                    <span className="text-orange-600 dark:text-orange-400 font-medium">عمولة شركة التوصيل ({rest.commissionRate}%)</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">- {rest.totalCommissionCut.toLocaleString()} ر.ي</span>
                  </div>
                )}

                {rest.totalSubsidy > 0 && (
                  <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
                    <span className="text-destructive font-medium">مديونية التوصيل (عروض مجانية)</span>
                    <span className="font-bold text-destructive">- {rest.totalSubsidy.toLocaleString()} ر.ي</span>
                  </div>
                )}
              </div>

              {/* Expanded: Order History */}
              {expandedRestaurant === rest.id && (
                <div className="border-t bg-muted/20">
                  {/* Share buttons */}
                  <div className="flex gap-2 p-3 border-b flex-wrap">
                    <Button size="sm" variant="outline" className="gap-1.5 border-green-500 text-green-600 hover:bg-green-50 text-xs"
                      onClick={() => shareViaWhatsApp(buildRestaurantShareText(rest))}>
                      <MessageCircle className="w-3.5 h-3.5" /> واتساب
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                      onClick={() => copyToClipboard(buildRestaurantShareText(rest), toast)}>
                      <FileText className="w-3.5 h-3.5" /> نسخ للمذكرة
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs border-pink-400 text-pink-500 hover:bg-pink-50"
                      onClick={() => copyToClipboard(buildRestaurantShareText(rest), toast)}>
                      <Share2 className="w-3.5 h-3.5" /> انستغرام
                    </Button>
                  </div>

                  {/* Order list */}
                  {rest.recentOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6 text-sm">لا توجد طلبات بعد</p>
                  ) : (
                    <div className="divide-y max-h-72 overflow-y-auto">
                      <div className="grid grid-cols-4 gap-2 px-4 py-2 text-[10px] font-bold text-muted-foreground bg-muted/50">
                        <span>العميل</span>
                        <span>نوع الوجبة</span>
                        <span className="text-center">المبلغ</span>
                        <span className="text-left">التاريخ</span>
                      </div>
                      {rest.recentOrders.map((order: any) => {
                        const items: any[] = order.items || [];
                        const itemNames = items.map((it: any) => it.name_ar || it.name || "—").join("، ");
                        const foodRevenue = Number(order.total || 0) - Number(order.delivery_fee || 0);
                        const subsidy = Number(order.restaurant_delivery_subsidy || 0);
                        const netRevenue = foodRevenue - subsidy;
                        const isDelivered = order.status === "delivered";
                        const isCodActive = order.payment_method === "cash" && !isDelivered;
                        return (
                          <div key={order.id} className={`px-4 py-2.5 text-xs hover:bg-muted/30 ${isCodActive ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}>
                            <div className="grid grid-cols-4 gap-2 items-center">
                              <span className="truncate font-medium">{order.customer_name || "—"}</span>
                              <span className="truncate text-muted-foreground" title={itemNames}>{itemNames || "—"}</span>
                              <span className={`text-center font-bold ${isCodActive ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}>
                                {isCodActive ? "⏳ " : ""}{netRevenue.toLocaleString()} ر.ي
                              </span>
                              <span className="text-left text-muted-foreground text-[10px]">
                                {new Date(order.created_at).toLocaleDateString("ar", { month: "short", day: "numeric" })}
                                {" "}
                                {new Date(order.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {isCodActive && (
                              <div className="mt-0.5 text-amber-600 dark:text-amber-400 text-[10px]">
                                💵 نقداً عند الاستلام — في الطريق، سيُسجَّل عند التوصيل
                              </div>
                            )}
                            {subsidy > 0 && (
                              <div className="mt-0.5 text-destructive text-[10px]">
                                مديونية توصيل: {subsidy.toLocaleString()} ر.ي
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
