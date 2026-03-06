-- 01_schemas.sql
-- Create application schemas.
--   internal: all tables (no direct application access)
--   api:      all stored functions (the only interface the application uses)

create schema if not exists internal;
create schema if not exists api;
