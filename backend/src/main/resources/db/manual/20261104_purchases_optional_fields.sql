ALTER TABLE purchases ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE purchases ALTER COLUMN unit_price DROP NOT NULL;
ALTER TABLE purchases ALTER COLUMN total_price DROP NOT NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(60);

ALTER TABLE purchase_returns ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE purchase_returns ALTER COLUMN unit_price DROP NOT NULL;
ALTER TABLE purchase_returns ALTER COLUMN total_price DROP NOT NULL;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(60);
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS purchase_id BIGINT;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
