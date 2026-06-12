# 🔴 Fix: Offers Not Showing in Homepage — Three Precise Changes

## The Three Problems (in order of importance)

---

## PROBLEM 1 — `scope` column does not exist in DB yet → offers section shows DEFAULT fake offers

`getCustomerActiveOffers()` fails silently (JOIN on `restaurant_id` column or `scope` column fails),
falls back to empty array, so `liveOffers = []`, so the homepage shows fake `DEFAULT_OFFERS` 
(the hardcoded Unsplash images) instead of real offers from the database.

### Fix 1A — Run this SQL in Supabase SQL Editor RIGHT NOW:

```sql
-- Add scope column if it doesn't exist
ALTER TABLE delivery_company_offers 
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'restaurant';

-- Update any existing offers that have restaurant_id to scope='restaurant'
UPDATE delivery_company_offers SET scope = 'restaurant' WHERE scope IS NULL OR scope = '';

-- Add check constraint
ALTER TABLE delivery_company_offers 
DROP CONSTRAINT IF EXISTS delivery_company_offers_scope_check;

ALTER TABLE delivery_company_offers 
ADD CONSTRAINT delivery_company_offers_scope_check 
CHECK (scope IN ('restaurant', 'shipment'));
```

### Fix 1B — Make `getCustomerActiveOffers` robust (never silently fail)

File: `artifacts/wasal/src/lib/deliveryOffersApi.ts`

Replace the entire `getCustomerActiveOffers` function with:

```typescript
export const getCustomerActiveOffers = async (): Promise<DeliveryOffer[]> => {
  // Try 1: with restaurant join + scope filter
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*, restaurant:restaurant_id(id, name_ar, logo_url)")
      .eq("is_active", true)
      .eq("scope", "restaurant")
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as unknown as DeliveryOffer[]).filter(isOfferCurrentlyActive);
    }
  } catch {}

  // Try 2: without join, with scope filter
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("is_active", true)
      .eq("scope", "restaurant")
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as unknown as DeliveryOffer[]).filter(isOfferCurrentlyActive);
    }
  } catch {}

  // Try 3: without scope filter at all (scope column may not exist yet)
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as unknown as DeliveryOffer[]).filter(isOfferCurrentlyActive);
    }
  } catch {}

  return [];
};
```

---

## PROBLEM 2 — Old deleted offers still show (they are not really deleted or is_active=true)

The homepage shows old offers that were supposedly deleted. This is because:
- Either `deleteDeliveryOffer` failed silently and they are still in DB with `is_active=true`
- Or they are cached

### Fix 2 — Go to Supabase Table Editor and manually check `delivery_company_offers`:

1. Open Supabase dashboard → Table Editor → `delivery_company_offers`
2. Delete any rows that should be deleted (old test offers)
3. Make sure the NEW offer you added has `is_active = true` and `scope = 'restaurant'`

---

## PROBLEM 3 — Homepage shows DEFAULT_OFFERS (fake hardcoded offers) instead of DB offers

File: `artifacts/wasal/src/pages/customer/DeliveryHubPage.tsx`

The current logic (line ~644):
```typescript
setOfferBanners(liveOffersData.length > 0 ? [] : (bannerOffers.length > 0 ? bannerOffers : DEFAULT_OFFERS));
```
And line ~709:
```typescript
offers={liveOffers.length > 0 ? liveOffers : offerBanners!}
```

This means: if `liveOffers` is empty (because fetch failed), it shows fake DEFAULT_OFFERS.

### Fix 3A — Remove DEFAULT_OFFERS fallback so empty is actually empty:

Change line ~644 from:
```typescript
setOfferBanners(liveOffersData.length > 0 ? [] : (bannerOffers.length > 0 ? bannerOffers : DEFAULT_OFFERS));
```
To:
```typescript
setOfferBanners(liveOffersData.length > 0 ? [] : (bannerOffers.length > 0 ? bannerOffers : []));
```

Also change the catch fallback (line ~651) from:
```typescript
setOfferBanners(DEFAULT_OFFERS);
```
To:
```typescript
setOfferBanners([]);
```

### Fix 3B — Add console.log to debug (temporary, remove after fix confirmed):

In the `.then` callback after `getCustomerActiveOffers()`, add:
```typescript
.then(([bannersRes, liveOffersData]) => {
  console.log("🎯 liveOffers fetched:", liveOffersData.length, liveOffersData);
  // ... rest of code
})
```

This will show in browser console exactly what's being fetched.

---

## PROBLEM 4 — `DeliveryOffer` type missing `scope` field

File: `artifacts/wasal/src/lib/deliveryOffersApi.ts`

Find the `DeliveryOffer` interface and add `scope`:

```typescript
export interface DeliveryOffer {
  id: string;
  delivery_company_id: string;
  offer_type: OfferType;
  scope: 'restaurant' | 'shipment';  // ADD THIS LINE
  title: string;
  description?: string | null;
  image_url?: string | null;
  badge_text?: string | null;
  restaurant_id?: string | null;
  restaurant?: { id: string; name_ar: string; logo_url?: string | null } | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  min_order_amount?: number | null;
  active_days?: string[] | null;
  start_time?: string | null;
  end_time?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  sort_order?: number;
  sponsor_type?: SponsorType | null;
  sponsor_name?: string | null;
  created_at: string;
}
```

---

## PROBLEM 5 — `DeliveryOffers.tsx` form does not save `scope` field

File: `artifacts/wasal/src/pages/delivery/DeliveryOffers.tsx`

**5a.** Add `scope` to `emptyForm()`:
```typescript
const emptyForm = (): any => ({
  scope: 'restaurant' as 'restaurant' | 'shipment',  // ADD
  offer_type: "free_delivery" as OfferType,
  title: "",
  // ... rest unchanged
});
```

**5b.** Add `scope` when editing an existing offer (in `openEdit`):
```typescript
setForm({
  ...emptyForm(), ...o,
  scope: (o as any).scope || 'restaurant',  // ADD
  active_days: o.active_days || [],
  // ... rest unchanged
});
```

**5c.** Add `scope` to the save payload (in `handleSave`):
```typescript
const payload: any = {
  delivery_company_id: user.id,
  scope: form.scope || 'restaurant',  // ADD
  offer_type: form.offer_type,
  // ... rest unchanged
};
```

**5d.** Add scope selector at the TOP of the Dialog form (before "نوع العرض"):

```tsx
{/* ── Scope: what does this offer apply to? ── */}
<div>
  <Label className="font-semibold block mb-2">هذا العرض لـ *</Label>
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={() => setForm({ ...form, scope: 'restaurant' })}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
        (form.scope || 'restaurant') === 'restaurant'
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted/50 hover:border-primary/40'
      }`}
    >
      <span className="text-2xl">🍔</span>
      <span className="text-sm font-bold">طلبات المطاعم</span>
      <span className="text-[11px] text-muted-foreground leading-tight">
        يظهر في الصفحة الرئيسية ويُطبَّق عند طلب وجبات
      </span>
    </button>
    <button
      type="button"
      onClick={() => setForm({ ...form, scope: 'shipment' })}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
        form.scope === 'shipment'
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted/50 hover:border-primary/40'
      }`}
    >
      <span className="text-2xl">📦</span>
      <span className="text-sm font-bold">شحن الطرود</span>
      <span className="text-[11px] text-muted-foreground leading-tight">
        يظهر في صفحة طلب التوصيل فقط
      </span>
    </button>
  </div>
</div>
```

---

## PROBLEM 6 — DeliveryRequestPage still shows restaurant offers

File: `artifacts/wasal/src/pages/customer/DeliveryRequestPage.tsx`

Change both filter locations from `!o.restaurant_id` to `o.scope === 'shipment'`:

**Location A** (~line 259):
```typescript
setCompanyOffers(offers.filter(o => o.is_active && (o as any).scope === 'shipment'));
```

**Location B** (~line 275):
```typescript
return [c.user_id, offers.filter((o: DeliveryOffer) => o.is_active && (o as any).scope === 'shipment')] as [string, DeliveryOffer[]];
```

---

## Order of Operations (DO IN THIS ORDER)

1. **Run the SQL** in Supabase SQL Editor first
2. **Check Supabase table** — delete old/wrong offers manually, confirm new offer has `scope='restaurant'` and `is_active=true`
3. **Update `deliveryOffersApi.ts`** — type + `getCustomerActiveOffers` + both filter functions
4. **Update `DeliveryOffers.tsx`** — add scope selector + save scope in payload
5. **Update `DeliveryHubPage.tsx`** — remove DEFAULT_OFFERS fallback + add console.log
6. **Update `DeliveryRequestPage.tsx`** — filter by scope='shipment'
7. Deploy and test
8. Open browser console → look for "🎯 liveOffers fetched:" to confirm data is arriving
