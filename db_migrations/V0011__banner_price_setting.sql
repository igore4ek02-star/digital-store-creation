INSERT INTO site_settings (key, value) VALUES ('banner_price_per_day', '300')
ON CONFLICT (key) DO NOTHING;
