CREATE TABLE IF NOT EXISTS internal_expense_settings (
  id BIGINT PRIMARY KEY CHECK (id = 1),
  default_currency VARCHAR(3) NOT NULL DEFAULT 'MZN',
  budget_alert_percent NUMERIC(5,2) NOT NULL DEFAULT 80.00
    CHECK (budget_alert_percent >= 1 AND budget_alert_percent <= 100),
  currency_options TEXT NOT NULL,
  expense_type_options TEXT NOT NULL,
  priority_options TEXT NOT NULL,
  payment_method_options TEXT NOT NULL
);

INSERT INTO internal_expense_settings (
  id,
  default_currency,
  budget_alert_percent,
  currency_options,
  expense_type_options,
  priority_options,
  payment_method_options
)
VALUES (
  1,
  'MZN',
  80.00,
  E'MZN=Metical\nUSD=Dólar americano\nEUR=Euro\nZAR=Rand',
  E'OPERATIONAL=Operacional\nPURCHASE=Compra\nSERVICE=Serviço\nPETTY_CASH=Pequena despesa\nREIMBURSEMENT=Reembolso',
  E'NORMAL=Normal\nHIGH=Alta\nURGENT=Urgente',
  E'TRANSFER=Transferência\nCASH=Numerário\nCARD=Cartão\nMOBILE=Pagamento móvel\nOTHER=Outro'
)
ON CONFLICT (id) DO NOTHING;
