-- 04_permissions.sql
-- Create the app_user role and grant minimal permissions.

-- Create the role only if it does not already exist.
do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'app_user') then
        create role app_user nologin;
    end if;
end
$$;

-- app_user can use the api schema and execute its functions.
grant usage on schema api to app_user;
grant execute on all functions in schema api to app_user;

-- app_user must NOT touch internal tables directly.
revoke all on schema internal from app_user;
revoke all on all tables in schema internal from app_user;

-- For local dev: the Docker POSTGRES_USER (mysite) also needs api access.
-- The superuser already has access, but explicit grants keep things clear.
grant usage on schema api to mysite;
grant execute on all functions in schema api to mysite;

-- Ensure future functions in api are also accessible.
alter default privileges in schema api grant execute on functions to app_user;
alter default privileges in schema api grant execute on functions to mysite;
