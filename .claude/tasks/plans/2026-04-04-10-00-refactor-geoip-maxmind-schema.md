# Refactor GeoIP Tables to MaxMind Recommended Schema

**Branch**: `refactor/geoip-maxmind-schema`
**Status**: In Progress

## Context

The current `internal.geoip_ranges` table uses a custom schema with `ip_start`/`ip_end` inet columns and a B-tree index. MaxMind recommends a normalized two-table design using the `cidr` type with a GiST index and `>>=` containment operator. This enables direct `\copy` from their CSV files with zero transformation and significantly faster lookups.

## Changes

### 1. Replace geoip_ranges with two new tables
**File(s):** `database/init/02_tables.sql`

- `internal.geoip2_networks` — all MaxMind CSV columns, GiST index on `network cidr`, no identity PK
- `internal.geoip2_locations` — all MaxMind CSV columns, composite PK `(geoname_id, locale_code)`
- No identity PKs on either table to enable direct `\copy` from CSV

### 2. Migration to drop old table
**File(s):** `database/migrations/002_drop_geoip_ranges.sql`

- `drop table if exists internal.geoip_ranges;`

### 3. Rewrite geoip_lookup function
**File(s):** `database/init/03_functions.sql`

- Join `geoip2_networks` to `geoip2_locations` using `network >>= p_ip::inet`
- Same return shape (country_code, country_name, region, city) plus latitude, longitude, time_zone
- Update comment on `insert_page_view` to reference MaxMind

### 4. Bump migration version
**File(s):** `infrastructure/cdk/lib/data-stack.ts`

- version: "15" → "16"

### 5. Update README
**File(s):** `README.md`

- New table names, `\copy` commands, load order

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `database/init/02_tables.sql` | Edit | Replace geoip_ranges with geoip2_networks + geoip2_locations |
| `database/init/03_functions.sql` | Edit | Rewrite geoip_lookup, update insert_page_view comment |
| `database/migrations/002_drop_geoip_ranges.sql` | Create | Drop old table |
| `infrastructure/cdk/lib/data-stack.ts` | Edit | Bump version 15 → 16 |
| `README.md` | Edit | Update GeoIP setup section |

## Verification

1. Backend lint + tests pass
2. CDK TypeScript compiles
3. Deploy → migration Lambda succeeds
4. `\copy` from MaxMind CSVs works with zero transformation
5. `select api.geoip_lookup('8.8.8.8');` returns correct jsonb
