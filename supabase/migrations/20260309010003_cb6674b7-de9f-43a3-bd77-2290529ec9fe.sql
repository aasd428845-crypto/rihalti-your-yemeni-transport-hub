
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS partner_phone TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS partner_bank_account TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS transaction_date DATE;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS transaction_time TIME;
