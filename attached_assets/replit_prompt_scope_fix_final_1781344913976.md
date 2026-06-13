# 🔴 FINAL FIX — Offers Not Showing in Homepage (Based on Actual Code Analysis)

## Context: What Was Confirmed by Reading the Actual Code

The following are CONFIRMED by reading the current source files:

1. `/api/offers/active.ts` EXISTS and works ✓
2. `getActiveOffersForCompany` with Supabase fallback EXISTS ✓  
3. Menu card offer banner EXISTS and handles all types ✓
4. **MISSING:** `scope` is NOT in `emptyForm()` or `handleSave` payload ✗
5. **MISSING:** `getCustomerActiveOffers` does NOT filter by `scope` ✗
6. **PRESENT:** `DEFAULT_OFFERS` hardcoded fallback still exists ✗
7. **NOT CONFIRMED:** `scope` SQL column may not exist in Supabase yet ✗

---

## STEP 1 — Run This SQL in Supabase SQL Editor (FIRST, BEFORE ANY CODE CHANGE)

```sql
-- 1. Add scope column
ALTER TABLE delivery_company_offers 
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'restaurant';

-- 2. Set all existing offers to 'restaurant' scope
UPDATE delivery_company_offers 
SET scope = 'restaurant' 
WHERE scope IS NULL;

-- 3. Deactivate any test/old offers that should be deleted
-- (Run this to see what's currently active)
SELECT id, title, offer_type, scope, is_active, created_at 
FROM delivery_company_offers 
ORDER BY created_at DESC;
```

After seeing the SELECT results, manually set `is_active = false` for any old unwanted offers:
```sql
-- Replace 'OLD_OFFER_ID_HERE' with actual IDs from the SELECT above
UPDATE delivery_company_offers SET is_active = false WHERE id = 'OLD_OFFER_ID_HERE';
```

---

## STEP 2 — Fix `emptyForm()` in `DeliveryOffers.tsx`

File: `artifacts/wasal/src/pages/delivery/DeliveryOffers.tsx`

**Current `emptyForm` (line ~49):**
```typescript
const emptyForm = (): any => ({
  offer_type: "free_delivery" as OfferType,
  title: "",
  ...
```

**Change to:**
```typescript
const emptyForm = (): any => ({
  scope: 'restaurant' as 'restaurant' | 'shipment',  // ADD THIS LINE
  offer_type: "free_delivery" as OfferType,
  title: "",
  ...
```

---

## STEP 3 — Fix `openEdit` in `DeliveryOffers.tsx`

Find the `openEdit` function. After `setForm({...emptyForm(), ...o, ...})`, add scope:

```typescript
const openEdit = (o: DeliveryOffer) => {
  setEditItem(o);
  setForm({
    ...emptyForm(), ...o,
    scope: (o as any).scope || 'restaurant',   // ADD THIS LINE
    active_days: o.active_days || [],
    // ... rest unchanged
  });
  setShowDialog(true);
};
```

---

## STEP 4 — Add `scope` to `handleSave` payload in `DeliveryOffers.tsx`

Find `handleSave` (line ~144). Inside the `payload` object, add `scope`:

```typescript
const payload: any = {
  delivery_company_id: user.id,
  scope: form.scope || 'restaurant',   // ADD THIS LINE
  offer_type: form.offer_type,
  title: form.title,
  // ... rest unchanged
};
```

---

## STEP 5 — Add scope selector to the form dialog in `DeliveryOffers.tsx`

Inside the Dialog `<div className="space-y-5">`, add this as the FIRST element (before "نوع العرض"):

```tsx
{/* ── Scope: what is this offer for? ── */}
<div>
  <Label className="font-semibold block mb-2">هذا العرض لـ *</Label>
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={() => setForm({ ...form, scope: 'restaurant' })}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
        (form.scope || 'restaurant') !== 'shipment'
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted/50 hover:border-primary/40'
      }`}
    >
      <span className="text-2xl">🍔</span>
      <span className="text-sm font-bold">طلبات المطاعم</span>
      <span className="text-[10px] text-muted-foreground leading-tight">
        يظهر في الصفحة الرئيسية ويُطبَّق عند طلب وجبات
      </span>
    </button>
    <button
      type="button"
      onClick={() => setForm({ ...form, scope: 'shipment' })}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
        form.scope === 'shipment'
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted/50 hover:border-primary/40'
      }`}
    >
      <span className="text-2xl">📦</span>
      <span className="text-sm font-bold">شحن الطرود</span>
      <span className="text-[10px] text-muted-foreground leading-tight">
        يظهر في صفحة طلب التوصيل فقط
      </span>
    </button>
  </div>
</div>
```

---

## STEP 6 — Fix `getCustomerActiveOffers` in `deliveryOffersApi.ts`

File: `artifacts/wasal/src/lib/deliveryOffersApi.ts`

Replace the ENTIRE `getCustomerActiveOffers` function with this robust version:

```typescript
export const getCustomerActiveOffers = async (): Promise<DeliveryOffer[]> => {
  // Attempt 1: With restaurant join + scope filter
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*, restaurant:restaurant_id(id, name_ar, logo_url)")
      .eq("is_active", true)
      .eq("scope", "restaurant")
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return (data as unknown as DeliveryOffer[]).filter(isOfferCurrentlyActive);
    }
    if (!error && data) {
      // No offers with scope='restaurant' — but query succeeded
      return [];
    }
    // error occurred — try without scope filter
  } catch {}

  // Attempt 2: Without scope filter (scope column may not exist yet)
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*, restaurant:restaurant_id(id, name_ar, logo_url)")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as unknown as DeliveryOffer[]).filter(isOfferCurrentlyActive);
    }
  } catch {}

  // Attempt 3: Without join (restaurant_id column may not exist)
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as unknown as DeliveryOffer[]).filter(isOfferCurrentlyActive);
    }
  } catch {}

  return [];
};
```

---

## STEP 7 — Remove DEFAULT_OFFERS fallback in `DeliveryHubPage.tsx`

File: `artifacts/wasal/src/pages/customer/DeliveryHubPage.tsx`

**Find line ~644:**
```typescript
setOfferBanners(liveOffersData.length > 0 ? [] : (bannerOffers.length > 0 ? bannerOffers : DEFAULT_OFFERS));
```
**Change to:**
```typescript
setOfferBanners(liveOffersData.length > 0 ? [] : (bannerOffers.length > 0 ? bannerOffers : []));
```

**Find line ~651 (catch block):**
```typescript
setOfferBanners(DEFAULT_OFFERS);
```
**Change to:**
```typescript
setOfferBanners([]);
```

**Add temporary debug log** (find the `.then` callback after `Promise.all`):
```typescript
}).then(([bannersRes, liveOffersData]) => {
  console.log("🎯 OFFERS DEBUG:", liveOffersData.length, "offers found:", liveOffersData.map(o => o.title));
  // ... rest of existing code unchanged
```

---

## STEP 8 — Filter scope in `DeliveryRequestPage.tsx` (use scope not restaurant_id)

File: `artifacts/wasal/src/pages/customer/DeliveryRequestPage.tsx`

The current filter uses `!o.restaurant_id` which is wrong. Change BOTH locations to use `scope`:

**Location A (~line 259):**
Change:
```typescript
setCompanyOffers(offers.filter(o => o.is_active && !o.restaurant_id));
```
To:
```typescript
setCompanyOffers(offers.filter(o => o.is_active && ((o as any).scope === 'shipment' || (!(o as any).scope && !o.restaurant_id))));
```

**Location B (~line 275):**
Change:
```typescript
return [c.user_id, offers.filter((o: DeliveryOffer) => o.is_active && !o.restaurant_id)] as [string, DeliveryOffer[]];
```
To:
```typescript
return [c.user_id, offers.filter((o: DeliveryOffer) => o.is_active && ((o as any).scope === 'shipment' || (!(o as any).scope && !o.restaurant_id)))] as [string, DeliveryOffer[]];
```

---

## STEP 9 — Add `scope` to `DeliveryOffer` type

File: `artifacts/wasal/src/lib/deliveryOffersApi.ts`

Find the `DeliveryOffer` interface and add:
```typescript
export interface DeliveryOffer {
  id: string;
  delivery_company_id: string;
  offer_type: OfferType;
  scope?: 'restaurant' | 'shipment';   // ADD THIS LINE
  // ... rest unchanged
```

---

## Order of Operations

1. **Run SQL in Supabase** (Step 1) — add scope column, view and deactivate old offers
2. **Edit `deliveryOffersApi.ts`** — Steps 6 and 9
3. **Edit `DeliveryOffers.tsx`** — Steps 2, 3, 4, 5
4. **Edit `DeliveryHubPage.tsx`** — Step 7
5. **Edit `DeliveryRequestPage.tsx`** — Step 8
6. **Deploy to Vercel**
7. **Open browser DevTools Console** → look for "🎯 OFFERS DEBUG:" message
8. **Add a test offer** from dashboard with scope="🍔 طلبات المطاعم", no days/times restrictions, is_active=ON
9. **Refresh homepage** → new offer should appear in "عروض وخصومات التوصيل"

---

## What's Already Working (Do NOT change)

- `/api/offers/active.ts` — correct, leave it
- `getActiveOffersForCompany` — correct, leave it  
- `getActiveOffersListForCompany` — correct, leave it
- `RestaurantMenuPage` offer banner — correct, leave it
- `RestaurantCheckoutPage` offer logic — correct, leave it
- `CartPage` offer display — correct, leave it
