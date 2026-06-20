---
name: Wasal commission system architecture
description: How the 3-way financial split works and key implementation decisions
---

## 3-Way Financial Split (Phase 1)

When an order is created (`restaurantApi.ts → createOrderFromCart`):
1. **Delivery company row** — `transaction_type: "delivery_order"`, `partner_type: "delivery_company"`
   - `amount` = delivery_fee + restaurant_delivery_subsidy
   - `platform_commission` = from `calculateCommission()` in accountingApi (reads accounting_settings, respects per-partner overrides)
   - `partner_earning` = amount - platform_commission
2. **Restaurant row** — `transaction_type: "restaurant_order"`, `partner_type: "restaurant"`
   - `amount` = order subtotal
   - `platform_commission` = 0 (restaurant pays commission to delivery company, not platform)
   - `partner_earning` = subtotal - (subtotal × commission_rate%) - delivery_subsidy

The entire split is wrapped in try/catch — it never blocks order creation.

## DB Migration Required
Before the financial split writes succeed, run in Supabase SQL Editor:
```sql
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS partner_type TEXT DEFAULT 'delivery_company';
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS order_id UUID;
```

## Per-Partner Commission Overrides
- Stored in `partner_commission_settings` table
- Admin UI: `/admin/commission-overrides` (AdminCommissionOverrides.tsx)
- `calculateCommission()` in accountingApi checks this table first, falls back to global accounting_settings

**Why:** Business requirement — different delivery companies may negotiate different rates.

## Invoice Generation
`generateMonthlyInvoicesForAllPartners()` in accountingApi:
- Reads all unpaid financial_transactions from previous month
- Groups by partner_id
- Creates one `partner_invoices` row per partner
- Invoice number format: `INV-{partner_id_first_6_chars_upper}-{YYYY-MM}`
