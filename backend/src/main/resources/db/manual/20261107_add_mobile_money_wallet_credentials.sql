ALTER TABLE mobile_money_wallets
    ADD COLUMN IF NOT EXISTS environment VARCHAR(20),
    ADD COLUMN IF NOT EXISTS service_provider_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS api_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS public_key TEXT;
