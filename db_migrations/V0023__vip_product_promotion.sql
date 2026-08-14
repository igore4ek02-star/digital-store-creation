ALTER TABLE products ADD COLUMN IF NOT EXISTS vip_until TIMESTAMP;

INSERT INTO site_settings (key, value) VALUES ('vip_price_per_day', '199')
ON CONFLICT (key) DO NOTHING;
INSERT INTO site_settings (key, value) VALUES ('vip_default_days', '7')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_products_vip_until ON products(vip_until);
