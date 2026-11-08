-- Testes e exames: por omissão "Sem taxa de cobrança"; "Cobrar" activa o processo de pagamento.
-- Inscrições sem taxa ficam com amount = 0 (estado FREE) e sem pagamentos.

-- 1) Por omissão, nenhum tipo cobra taxa.
ALTER TABLE test_settings
    ALTER COLUMN normal_fee_active SET DEFAULT FALSE,
    ALTER COLUMN recovery_fee_active SET DEFAULT FALSE,
    ALTER COLUMN special_fee_active SET DEFAULT FALSE;

ALTER TABLE exam_settings
    ALTER COLUMN normal_fee_active SET DEFAULT FALSE,
    ALTER COLUMN recurrence_fee_active SET DEFAULT FALSE,
    ALTER COLUMN special_fee_active SET DEFAULT FALSE;

-- 2) Tipos que nunca tiveram taxa definida passam a "Sem taxa de cobrança".
UPDATE test_settings SET normal_fee_active = FALSE WHERE normal_fee <= 0;
UPDATE test_settings SET recovery_fee_active = FALSE WHERE recovery_fee <= 0;
UPDATE test_settings SET special_fee_active = FALSE WHERE special_fee <= 0;
UPDATE exam_settings SET normal_fee_active = FALSE WHERE normal_fee <= 0;
UPDATE exam_settings SET recurrence_fee_active = FALSE WHERE recurrence_fee <= 0;
UPDATE exam_settings SET special_fee_active = FALSE WHERE special_fee <= 0;

-- 3) Permitir inscrições sem taxa (amount = 0).
ALTER TABLE test_registrations DROP CONSTRAINT IF EXISTS test_registrations_amount_check;
ALTER TABLE test_registrations ADD CONSTRAINT test_registrations_amount_check CHECK (amount >= 0);
ALTER TABLE exam_registrations DROP CONSTRAINT IF EXISTS exam_registrations_amount_check;
ALTER TABLE exam_registrations ADD CONSTRAINT exam_registrations_amount_check CHECK (amount >= 0);
