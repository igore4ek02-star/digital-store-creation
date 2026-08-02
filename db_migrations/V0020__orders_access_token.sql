ALTER TABLE orders ADD COLUMN IF NOT EXISTS access_token VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_orders_access_token ON orders(access_token);