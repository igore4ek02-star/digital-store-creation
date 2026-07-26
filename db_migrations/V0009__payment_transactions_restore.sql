CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(10) NOT NULL,
    user_id INTEGER NULL REFERENCES users(id),
    order_id INTEGER NULL REFERENCES orders(id),
    email VARCHAR(255),
    method VARCHAR(20) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    external_id VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_user ON payment_transactions(user_id);

ALTER TABLE payouts ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS error TEXT;
