CREATE TABLE IF NOT EXISTS system_instance (
  id BIGINT PRIMARY KEY,
  is_partition BOOLEAN NOT NULL,
  institution_name VARCHAR(200),
  address VARCHAR(500),
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system_partitions (
  id BIGSERIAL PRIMARY KEY,
  institution_name VARCHAR(200) NOT NULL,
  address VARCHAR(500) NOT NULL,
  database_name VARCHAR(63) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE system_partitions ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE system_partitions ADD COLUMN IF NOT EXISTS port INTEGER;
