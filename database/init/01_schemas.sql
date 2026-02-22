-- 01_schemas.sql
-- Create application schemas.
--   internal: all tables (no direct application access)
--   api:      all stored functions (the only interface the application uses)

CREATE SCHEMA IF NOT EXISTS internal;
CREATE SCHEMA IF NOT EXISTS api;
