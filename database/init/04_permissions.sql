-- 04_permissions.sql
-- Create the app_user role and grant minimal permissions.

-- Create the role only if it does not already exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user NOLOGIN;
    END IF;
END
$$;

-- app_user can use the api schema and execute its functions.
GRANT USAGE ON SCHEMA api TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA api TO app_user;

-- app_user must NOT touch internal tables directly.
REVOKE ALL ON SCHEMA internal FROM app_user;
REVOKE ALL ON ALL TABLES IN SCHEMA internal FROM app_user;

-- For local dev: the Docker POSTGRES_USER (mysite) also needs api access.
-- The superuser already has access, but explicit grants keep things clear.
GRANT USAGE ON SCHEMA api TO mysite;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA api TO mysite;

-- Ensure future functions in api are also accessible.
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT EXECUTE ON FUNCTIONS TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT EXECUTE ON FUNCTIONS TO mysite;
