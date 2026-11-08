CREATE TABLE IF NOT EXISTS fine_settings (
  id BIGINT PRIMARY KEY,
  late_percent NUMERIC(5,2)
);
ALTER TABLE student_fee_charges ADD COLUMN IF NOT EXISTS fine_amount NUMERIC(12,2);
ALTER TABLE student_fee_charges ADD COLUMN IF NOT EXISTS fine_percent NUMERIC(5,2);
