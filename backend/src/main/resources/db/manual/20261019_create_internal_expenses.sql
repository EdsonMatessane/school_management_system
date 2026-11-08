-- CACOIN | Despesas Internas | Execute manualmente antes de utilizar o módulo.
CREATE TABLE IF NOT EXISTS internal_expense_categories (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  attachment_required BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS internal_expense_suppliers (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  legal_name VARCHAR(180) NOT NULL,
  trading_name VARCHAR(180),
  tax_identifier VARCHAR(80),
  phone VARCHAR(80),
  email VARCHAR(180),
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS internal_expenses (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(32) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  expense_type VARCHAR(32) NOT NULL,
  expense_date DATE NOT NULL,
  due_date DATE,
  currency VARCHAR(3) NOT NULL DEFAULT 'MZN',
  base_amount NUMERIC(14,2) NOT NULL CHECK (base_amount > 0),
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  other_charges NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (other_charges >= 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
  approved_amount NUMERIC(14,2),
  priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
  requester_name VARCHAR(180) NOT NULL,
  department VARCHAR(120) NOT NULL,
  cost_center VARCHAR(120),
  category_id BIGINT NOT NULL REFERENCES internal_expense_categories(id),
  supplier_id BIGINT REFERENCES internal_expense_suppliers(id),
  external_document_number VARCHAR(120),
  notes TEXT,
  approval_status VARCHAR(24) NOT NULL DEFAULT 'DRAFT'
    CHECK (approval_status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','RETURNED','CANCELLED')),
  payment_status VARCHAR(16) NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID','PARTIAL','PAID')),
  last_decision_by VARCHAR(180),
  last_decision_comment TEXT,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_internal_expense_external_document UNIQUE (category_id, external_document_number)
);
CREATE INDEX IF NOT EXISTS ix_internal_expenses_reference ON internal_expenses(reference);
CREATE INDEX IF NOT EXISTS ix_internal_expenses_date ON internal_expenses(expense_date);
CREATE INDEX IF NOT EXISTS ix_internal_expenses_status ON internal_expenses(approval_status, payment_status);
CREATE INDEX IF NOT EXISTS ix_internal_expenses_category ON internal_expenses(category_id);
CREATE INDEX IF NOT EXISTS ix_internal_expenses_department ON internal_expenses(department);
CREATE INDEX IF NOT EXISTS ix_internal_expenses_supplier ON internal_expenses(supplier_id);

CREATE TABLE IF NOT EXISTS internal_expense_payments (
  id BIGSERIAL PRIMARY KEY,
  reference VARCHAR(32) NOT NULL UNIQUE,
  expense_id BIGINT NOT NULL REFERENCES internal_expenses(id),
  payment_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method VARCHAR(80) NOT NULL,
  external_reference VARCHAR(160),
  recorded_by VARCHAR(180) NOT NULL,
  reversed BOOLEAN NOT NULL DEFAULT FALSE,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_internal_expense_payments_expense ON internal_expense_payments(expense_id);

CREATE TABLE IF NOT EXISTS internal_expense_budgets (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MZN',
  approved_amount NUMERIC(14,2) NOT NULL CHECK (approved_amount > 0),
  department VARCHAR(120) NOT NULL,
  cost_center VARCHAR(120),
  category_id BIGINT REFERENCES internal_expense_categories(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_internal_expense_budget_period CHECK (period_end >= period_start)
);
CREATE INDEX IF NOT EXISTS ix_internal_expense_budgets_period
  ON internal_expense_budgets(period_start, period_end, department);

CREATE TABLE IF NOT EXISTS internal_expense_audit (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES internal_expenses(id),
  action VARCHAR(32) NOT NULL,
  actor VARCHAR(180) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_internal_expense_audit_expense
  ON internal_expense_audit(expense_id, created_at DESC);

INSERT INTO internal_expense_categories (code, name, description)
VALUES
  ('OPERACIONAL', 'Despesas operacionais', 'Despesas operacionais gerais'),
  ('SERVICOS', 'Serviços', 'Serviços contratados'),
  ('COMPRAS', 'Compras', 'Aquisição de bens e materiais'),
  ('REEMBOLSO', 'Reembolsos', 'Reembolsos a colaboradores')
ON CONFLICT (code) DO NOTHING;
