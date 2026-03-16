---
globs:
  - "database/**"
  - "**/*.sql"
---

# PostgreSQL Schema Design

> **MANDATORY**: Every table must have an `id` column with `generated always as identity` and a `comment on table` statement.

## Primary Keys

- Non-lookup tables: `int4 generated always as identity` (use `int8` if table may exceed ~2 billion rows)
- Lookup tables: choose smallest type that fits (e.g., `int2` for small reference tables)
- Lookup tables with stable values across deployments: hard-code IDs. Otherwise use identity.

## Data Types

- Prefer `timestamptz` over `timestamp`
- Prefer `text` over `varchar`
- Use **UUIDv7** when applicable (function `uuidv7()`, PG18+)
- Never use `money` — store as cents/smallest unit instead
- Timestamps: columns named `created_at`/`updated_at`, always `timestamptz`

## Naming

- `snake_case` for all identifiers
- Plural table names: `users`, `blog_posts`
- Singular column names: `email`, `status`
- Foreign keys: singular table name + `_id` suffix (e.g., `blog_post_id`)
- Avoid SQL reserved words; keep names unique and under 63 characters

## Comments

- Use `comment on table/column/...` for all database objects
- Short and precise, max 1024 characters
- Explain purpose, not implementation
- Include valid values for enums or constrained fields

## Triggers Policy

- Never use table triggers unless there are no viable alternatives
- Always prefer functions and/or stored procedures over table triggers
- If a trigger is genuinely the only option, add a comment explaining why alternatives were ruled out

## General Conventions

- Use PostgreSQL functions for business logic
- Prefer stored procedures for multi-step transactional operations
- Include schema in queries for clarity

## Verification

- Check table comments exist: `select tablename from pg_tables where schemaname = 'internal' except select objname from pg_description...`
