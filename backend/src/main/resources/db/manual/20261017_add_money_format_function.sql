-- Formato único de dinheiro também na base de dados: 3,000.00 MZN.
-- Os valores continuam guardados como NUMERIC com duas casas decimais (nunca como texto com
-- separadores, para não quebrar somas, comparações e ordenação); esta função apenas formata.
-- Os caracteres "," e "." do modelo de to_char são literais e não dependem do idioma da base.
--
-- Exemplos:
--   SELECT format_money(3000);                  -- 3,000.00 MZN
--   SELECT format_money(3000.5, 'USD');         -- 3,000.50 USD
--   SELECT period_label, format_money(amount) AS valor FROM student_fee_charges;
CREATE OR REPLACE FUNCTION format_money(amount NUMERIC, currency TEXT DEFAULT 'MZN')
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE
        WHEN amount IS NULL THEN NULL
        ELSE to_char(round(amount, 2), 'FM99,999,999,999,999,990.00') || ' ' || currency
    END
$$;
