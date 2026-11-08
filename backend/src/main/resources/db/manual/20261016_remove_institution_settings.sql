ALTER TABLE system_settings
    DROP COLUMN IF EXISTS school_name,
    DROP COLUMN IF EXISTS short_name,
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS address,
    DROP COLUMN IF EXISTS city,
    DROP COLUMN IF EXISTS country;
