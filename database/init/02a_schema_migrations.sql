-- 02a_schema_migrations.sql
-- Tracks which migration files have been applied so they run exactly once.

create table if not exists internal.schema_migrations
(
  id         int4 generated always as identity primary key,
  filename   text not null unique,
  applied_at timestamptz default now()
);

comment on table internal.schema_migrations is 'Tracks applied database migration files to ensure each runs exactly once';
comment on column internal.schema_migrations.filename is 'Base filename of the migration SQL file';
comment on column internal.schema_migrations.applied_at is 'Timestamp when the migration was executed';
