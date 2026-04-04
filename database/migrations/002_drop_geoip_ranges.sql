-- Drop the old geoip_ranges table, replaced by geoip2_networks + geoip2_locations
drop table if exists internal.geoip_ranges;
