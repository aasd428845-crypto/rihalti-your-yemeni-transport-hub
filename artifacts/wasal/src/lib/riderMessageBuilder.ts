// ─── Helper: detect if order is a custom delivery request ────────────────────
export const isDeliveryRequest = (order: any): boolean => {
  const firstItem = order?.items?.[0];
  return firstItem?.order_type === "delivery_request";
};

// ─── Helper: extract delivery request metadata from items ────────────────────
export const getDeliveryRequestInfo = (order: any) => {
  const meta = order?.items?.[0] || {};
  return {
    serviceType: meta.service_type || "parcel",
    pickupAddress: meta.pickup_address || "",
    pickupLat: meta.pickup_lat || null,
    pickupLng: meta.pickup_lng || null,
    pickupLandmark: meta.pickup_landmark || "",
    deliveryLandmark: meta.delivery_landmark || "",
    recipientName: meta.recipient_name || "",
    recipientPhone: meta.recipient_phone || "",
    senderName: meta.sender_name || "",
    senderPhone: meta.sender_phone || "",
    itemDescription: meta.item_description || "",
    itemSize: meta.item_size || "",
    notes: meta.notes || "",
    distanceKm: meta.distance_km || null,
    pricePerKm: meta.price_per_km || null,
    offerApplied: meta.offer_applied || null,
    imageUrl: meta.image_url || "",
  };
};

// ─── Format restaurant order items for rider message ────────────────────────
export const formatItemsForMessage = (items: any[]): string => {
  if (!items?.length) return "";
  const lines: string[] = [];
  for (const item of items) {
    if (item.order_type === "delivery_request") continue;
    const name = item.name_ar || item.name || "صنف";
    const qty  = item.quantity || 1;
    const price = item.price ? ` (${Number(item.price).toLocaleString()} ر.ي)` : "";
    lines.push(`   • ${qty}x ${name}${price}`);
    const opts: any[] = item.options || item.selected_options || [];
    for (const opt of opts) {
      const optName = opt.name_ar || opt.name || "";
      const optItems: any[] = opt.items || opt.selected || [];
      if (optItems.length) {
        for (const oi of optItems) {
          const oiName = oi.name_ar || oi.name || "";
          const oiPrice = oi.price ? ` (+${Number(oi.price).toLocaleString()})` : "";
          lines.push(`      ➕ ${oiName}${oiPrice}`);
        }
      } else if (optName) {
        const optPrice = opt.price ? ` (+${Number(opt.price).toLocaleString()})` : "";
        lines.push(`      ➕ ${optName}${optPrice}`);
      }
    }
    if (item.notes) lines.push(`      📌 ${item.notes}`);
  }
  return lines.join("\n");
};

// ─── Build order message text for rider ──────────────────────────────────────
export const buildRiderMessageText = (order: any): string => {
  const isReq = isDeliveryRequest(order);
  const info = isReq ? getDeliveryRequestInfo(order) : null;

  const pickupMapLink = info?.pickupLat ? `https://maps.google.com/?q=${info.pickupLat},${info.pickupLng}` : null;
  const dropoffMapLink = order.delivery_lat ? `https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}` : null;

  const svcLabel = info?.serviceType === "shopping" ? "تسوق" : info?.serviceType === "meal" ? "توصيل وجبة" : "نقل طرد";

  const totalAmt = Number(order.total || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const paymentLine =
    order.payment_method === "cash"
      ? `💵 *الدفع: نقداً عند الاستلام*\n   ┗ يرجى تحصيل *${totalAmt.toLocaleString()} ر.ي* من العميل`
      : order.payment_method === "bank_transfer"
      ? `✅ *الدفع: تم مسبقاً (تحويل بنكي) — لا يلزم تحصيل أي مبلغ*`
      : order.payment_method === "online"
      ? `✅ *الدفع: تم مسبقاً إلكترونياً — لا يلزم تحصيل أي مبلغ*`
      : `💳 *الدفع: ${order.payment_method || "—"}*`;

  const itemsText = !isReq ? formatItemsForMessage(order.items || []) : "";

  const lines = [
    `🚚 *مهمة توصيل جديدة — وصال*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    order.restaurant?.name_ar ? `🏪 *المطعم/المتجر:* ${order.restaurant.name_ar}` : null,
    order.restaurant?.address ? `   📌 عنوان المطعم: ${order.restaurant.address}` : null,
    order.restaurant?.phone   ? `   📞 هاتف المطعم: ${order.restaurant.phone}` : null,
    isReq ? `📦 *نوع الخدمة:* ${svcLabel}` : null,
    ``,
    itemsText ? `🍽️ *الأصناف المطلوبة:*\n${itemsText}` : null,
    itemsText ? `` : null,
    itemsText && deliveryFee > 0 ? `💰 *المجموع:* ${(totalAmt - deliveryFee).toLocaleString()} ر.ي + رسوم توصيل ${deliveryFee.toLocaleString()} ر.ي = *${totalAmt.toLocaleString()} ر.ي*` : null,
    itemsText && deliveryFee === 0 ? `💰 *إجمالي الطلب:* ${totalAmt.toLocaleString()} ر.ي` : null,
    itemsText ? `` : null,
    `📍 *نقطة الاستلام (من):*`,
    `   ${info?.pickupAddress || order.restaurant?.address || order.customer_address || "—"}`,
    info?.pickupLandmark ? `   المعلم: ${info.pickupLandmark}` : null,
    pickupMapLink ? `   🗺️ ${pickupMapLink}` : null,
    ``,
    `📍 *نقطة التسليم (إلى):*`,
    `   ${order.customer_address || "—"}`,
    info?.deliveryLandmark ? `   المعلم: ${info.deliveryLandmark}` : null,
    dropoffMapLink ? `   🗺️ ${dropoffMapLink}` : null,
    ``,
    info?.senderName
      ? `👤 *المرسِل:* ${info.senderName}${info.senderPhone ? ` — ${info.senderPhone}` : ""}`
      : `👤 *العميل:* ${order.customer_name || "—"}${order.customer_phone ? ` — ${order.customer_phone}` : ""}`,
    info?.recipientName ? `👤 *المستلِم:* ${info.recipientName}${info.recipientPhone ? ` — ${info.recipientPhone}` : ""}` : null,
    ``,
    info?.itemDescription ? `📝 *وصف الطرد:* ${info.itemDescription}` : null,
    (info?.notes || order.notes) ? `📌 *ملاحظات:* ${info?.notes || order.notes}` : null,
    `━━━━━━━━━━━━━━━━━━━━`,
    paymentLine,
  ].filter((l): l is string => l !== null);

  return lines.join("\n");
};

// ─── Build WhatsApp link for rider ───────────────────────────────────────────
export const buildRiderWhatsApp = (order: any, riderPhone: string): string => {
  const text = buildRiderMessageText(order);
  const phone = riderPhone.replace(/\D/g, "");
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
};

// ─── Build Telegram link for rider ───────────────────────────────────────────
export const buildRiderTelegram = (order: any): string => {
  const text = buildRiderMessageText(order);
  return `https://t.me/share/url?text=${encodeURIComponent(text)}`;
};
