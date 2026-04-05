-- 007_geoip_refresh.sql
-- Staging infrastructure for zero-downtime GeoIP data refresh.
-- Creates staging schema with mirror tables, atomic swap function, and update log.

-- staging schema for bulk-loading GeoIP data without locking production tables
create schema if not exists staging;

-- mirror of internal.geoip2_networks (no indexes — built dynamically before each swap)
create table if not exists staging.geoip2_networks
(
  network                          cidr    not null,
  geoname_id                       int4,
  registered_country_geoname_id    int4,
  represented_country_geoname_id   int4,
  is_anonymous_proxy               bool,
  is_satellite_provider            bool,
  postal_code                      text,
  latitude                         numeric,
  longitude                        numeric,
  accuracy_radius                  int4,
  is_anycast                       bool
);

comment on table staging.geoip2_networks is
    'Staging table for GeoIP network blocks; bulk-loaded then swapped into internal schema';

-- mirror of internal.geoip2_locations (no indexes — built dynamically before each swap)
create table if not exists staging.geoip2_locations
(
  geoname_id                int4    not null,
  locale_code               text    not null,
  continent_code            text,
  continent_name            text,
  country_iso_code          text,
  country_name              text,
  subdivision_1_iso_code    text,
  subdivision_1_name        text,
  subdivision_2_iso_code    text,
  subdivision_2_name        text,
  city_name                 text,
  metro_code                int4,
  time_zone                 text,
  is_in_european_union      bool    not null
);

comment on table staging.geoip2_locations is
    'Staging table for GeoIP location names; bulk-loaded then swapped into internal schema';

-- update log to track refresh history and enable HEAD-based skip logic
create table if not exists internal.geoip_update_log
(
  id              int4        generated always as identity primary key,
  updated_at      timestamptz not null default now(),
  network_rows    int4        not null,
  location_rows   int4        not null,
  duration_ms     int4        not null,
  last_modified   text,
  status          text        not null default 'success'
);

comment on table internal.geoip_update_log is
    'Tracks GeoIP data refresh history: row counts, duration, and MaxMind Last-Modified header for skip logic';

-- internal.geoip_swap_staging()
-- Atomic rename swap: moves staging tables into internal schema and recreates empty staging tables.
-- The rename is metadata-only (microseconds). PL/pgSQL functions resolve table names at execution
-- time, so api.geoip_lookup() seamlessly picks up the new data.
create or replace function internal.geoip_swap_staging()
returns void as $$
begin
    -- drop old tables if they exist from a previous swap
    drop table if exists internal.geoip2_networks_old;
    drop table if exists internal.geoip2_locations_old;

    -- rename production tables to _old
    alter table internal.geoip2_networks rename to geoip2_networks_old;
    alter table internal.geoip2_locations rename to geoip2_locations_old;

    -- move staging tables into internal schema (they inherit the production names)
    alter table staging.geoip2_networks set schema internal;
    alter table staging.geoip2_locations set schema internal;

    -- drop old tables
    drop table internal.geoip2_networks_old;
    drop table internal.geoip2_locations_old;

    -- recreate empty staging tables for the next run
    create table staging.geoip2_networks
    (
      network                          cidr    not null,
      geoname_id                       int4,
      registered_country_geoname_id    int4,
      represented_country_geoname_id   int4,
      is_anonymous_proxy               bool,
      is_satellite_provider            bool,
      postal_code                      text,
      latitude                         numeric,
      longitude                        numeric,
      accuracy_radius                  int4,
      is_anycast                       bool
    );

    create table staging.geoip2_locations
    (
      geoname_id                int4    not null,
      locale_code               text    not null,
      continent_code            text,
      continent_name            text,
      country_iso_code          text,
      country_name              text,
      subdivision_1_iso_code    text,
      subdivision_1_name        text,
      subdivision_2_iso_code    text,
      subdivision_2_name        text,
      city_name                 text,
      metro_code                int4,
      time_zone                 text,
      is_in_european_union      bool    not null
    );
end;
$$ language plpgsql
security definer
set search_path = internal, staging;

comment on function internal.geoip_swap_staging() is
    'Atomic rename swap: moves staging GeoIP tables into internal schema with zero downtime';

revoke execute on function internal.geoip_swap_staging() from public;

-- grant the master user (mysite) access to staging schema
grant all on schema staging to mysite;
grant all on all tables in schema staging to mysite;
alter default privileges in schema staging grant all on tables to mysite;
