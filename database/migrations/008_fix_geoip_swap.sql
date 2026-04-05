-- 008_fix_geoip_swap.sql
-- Fix geoip_swap_staging() to drop old tables before moving staging in,
-- avoiding constraint name conflicts (e.g. geoip2_locations_pkey).

create or replace function internal.geoip_swap_staging()
returns void as $$
begin
    -- drop old tables if they exist from a previous swap
    drop table if exists internal.geoip2_networks_old;
    drop table if exists internal.geoip2_locations_old;

    -- rename production tables to _old, then drop immediately
    -- (must drop before moving staging in to avoid constraint name conflicts,
    -- e.g. geoip2_locations_pkey exists on both old and staging tables)
    alter table internal.geoip2_networks rename to geoip2_networks_old;
    alter table internal.geoip2_locations rename to geoip2_locations_old;
    drop table internal.geoip2_networks_old;
    drop table internal.geoip2_locations_old;

    -- move staging tables into internal schema (they inherit the production names)
    alter table staging.geoip2_networks set schema internal;
    alter table staging.geoip2_locations set schema internal;

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
