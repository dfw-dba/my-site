-- 00_extensions.sql
-- Install required PostgreSQL extensions in the public schema.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
