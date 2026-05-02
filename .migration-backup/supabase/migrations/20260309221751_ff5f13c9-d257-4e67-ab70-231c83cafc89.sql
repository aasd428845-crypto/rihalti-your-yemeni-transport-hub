INSERT INTO admin_settings (key, value, description)
VALUES ('cash_on_delivery_enabled', 'true', 'تفعيل خيار الدفع النقدي عند الاستلام/الصعود')
ON CONFLICT (key) DO UPDATE SET value = 'true';