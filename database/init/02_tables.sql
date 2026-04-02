-- 02_tables.sql
-- All tables live in the internal schema.

-- ============================================================
-- professional_entries
-- ============================================================
create table if not exists internal.professional_entries
(
  id           int4 generated always as identity primary key,
  entry_type   text not null check (entry_type in ('work', 'education', 'certification', 'award', 'hobby')),
  title        text not null,
  organization text not null,
  location     text,
  start_date   date not null,
  end_date     date,
  description  text,
  highlights   jsonb default '[]',
  technologies jsonb default '[]',
  sort_order   int4 default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table internal.professional_entries is 'Work history, education, certifications, and awards';
comment on column internal.professional_entries.entry_type is 'One of: work, education, certification, award, hobby';
comment on column internal.professional_entries.highlights is 'JSON array of bullet-point strings';
comment on column internal.professional_entries.technologies is 'JSON array of technology name strings';

-- ============================================================
-- resume_summary (single-row)
-- ============================================================
create table if not exists internal.resume_summary
(
  id           int4 generated always as identity primary key,
  headline     text,
  text         text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table internal.resume_summary is 'Single-row table holding the resume summary/headline text';
comment on column internal.resume_summary.headline is 'Optional headline displayed above the summary text';
comment on column internal.resume_summary.text is 'Plain-text summary; newlines are preserved for display';

-- ============================================================
-- resume_title (single-row)
-- ============================================================
create table if not exists internal.resume_title
(
  id           int4 generated always as identity primary key,
  title        text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table internal.resume_title is 'Single-row table holding the browser tab title for the resume page';
comment on column internal.resume_title.title is 'The text displayed in the browser tab when viewing the resume';

-- ============================================================
-- resume_contact (single-row)
-- ============================================================
create table if not exists internal.resume_contact
(
  id           int4 generated always as identity primary key,
  linkedin     text,
  github       text,
  email        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table internal.resume_contact is 'Single-row table holding contact/social links';
comment on column internal.resume_contact.linkedin is 'LinkedIn profile URL';
comment on column internal.resume_contact.github is 'GitHub profile URL';
comment on column internal.resume_contact.email is 'Contact email address';

-- ============================================================
-- resume_recommendations (multi-row)
-- ============================================================
create table if not exists internal.resume_recommendations
(
  id           int4 generated always as identity primary key,
  author       text not null,
  title        text not null,
  text         text not null,
  linkedin_url text,
  sort_order   int4 default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Columns added after initial table creation.
-- CREATE TABLE IF NOT EXISTS is a no-op on existing tables, so columns
-- added in later revisions need ALTER TABLE ADD COLUMN IF NOT EXISTS
-- to keep init scripts idempotent across re-runs.
alter table internal.resume_recommendations
  add column if not exists linkedin_url text;

comment on table internal.resume_recommendations is 'LinkedIn recommendations displayed on the resume page';
comment on column internal.resume_recommendations.author is 'Name of the person who wrote the recommendation';
comment on column internal.resume_recommendations.title is 'Job title of the recommender';
comment on column internal.resume_recommendations.text is 'Full text of the recommendation';
comment on column internal.resume_recommendations.linkedin_url is 'LinkedIn profile URL of the recommender';
comment on column internal.resume_recommendations.sort_order is 'Display order; lower values appear first';

-- ============================================================
-- resume_profile_image (single-row)
-- ============================================================
create table if not exists internal.resume_profile_image
(
  id           int4 generated always as identity primary key,
  image_url    text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table internal.resume_profile_image is 'Single-row table holding the profile image URL for the resume page';
comment on column internal.resume_profile_image.image_url is 'Public URL of the uploaded profile image';

-- ============================================================
-- performance_reviews
-- ============================================================
create table if not exists internal.performance_reviews
(
  id              int4 generated always as identity primary key,
  entry_id        int4 not null references internal.professional_entries(id) on delete cascade,
  reviewer_name   text not null,
  reviewer_title  text,
  review_date     date,
  review_text     text not null,
  sort_order      int4 default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

comment on table internal.performance_reviews is 'Performance evaluation excerpts linked to professional entries';
comment on column internal.performance_reviews.entry_id is 'FK to professional_entries.id';
comment on column internal.performance_reviews.reviewer_name is 'Name of the reviewer (e.g. manager, peer)';
comment on column internal.performance_reviews.reviewer_title is 'Job title or role of the reviewer';
comment on column internal.performance_reviews.review_text is 'The performance review excerpt text';

-- ============================================================
-- app_logs
-- ============================================================
create table if not exists internal.app_logs
(
  id              int8 generated always as identity primary key,
  level           text not null check (level in ('DEBUG', 'INFO', 'WARNING', 'ERROR')),
  message         text not null,
  logger          text,
  request_method  text,
  request_path    text,
  status_code     int2,
  duration_ms     int4,
  client_ip       text,
  error_detail    text,
  extra           jsonb default '{}',
  created_at      timestamptz default now()
);

comment on table internal.app_logs is 'Application request and error logs for admin dashboard visibility';
comment on column internal.app_logs.level is 'One of: DEBUG, INFO, WARNING, ERROR';
comment on column internal.app_logs.error_detail is 'Full traceback for error-level logs';

-- ============================================================
-- metric_snapshots
-- ============================================================
create table if not exists internal.metric_snapshots
(
  id              int8 generated always as identity primary key,
  captured_at     timestamptz default now(),
  snapshot_type   text not null check (snapshot_type in ('scheduled', 'manual'))
);

comment on table internal.metric_snapshots is 'Metadata for periodic database performance metric captures';
comment on column internal.metric_snapshots.snapshot_type is 'One of: scheduled, manual';

-- ============================================================
-- stat_statements_history
-- ============================================================
create table if not exists internal.stat_statements_history
(
  id                int8 generated always as identity primary key,
  snapshot_id       int8 not null references internal.metric_snapshots(id) on delete cascade,
  queryid           int8,
  query             text,
  calls             int8,
  total_exec_time   float8,
  mean_exec_time    float8,
  min_exec_time     float8,
  max_exec_time     float8,
  stddev_exec_time  float8,
  rows              int8,
  shared_blks_hit   int8,
  shared_blks_read  int8,
  temp_blks_written int8,
  wal_bytes         int8
);

comment on table internal.stat_statements_history is 'Historical snapshots of pg_stat_statements for query performance tracking';
comment on column internal.stat_statements_history.queryid is 'pg_stat_statements query hash identifier';
comment on column internal.stat_statements_history.stddev_exec_time is 'High stddev relative to mean indicates plan instability';

-- ============================================================
-- stat_tables_history
-- ============================================================
create table if not exists internal.stat_tables_history
(
  id                int8 generated always as identity primary key,
  snapshot_id       int8 not null references internal.metric_snapshots(id) on delete cascade,
  schemaname        text,
  relname           text,
  seq_scan          int8,
  seq_tup_read      int8,
  idx_scan          int8,
  idx_tup_fetch     int8,
  n_tup_ins         int8,
  n_tup_upd         int8,
  n_tup_del         int8,
  n_dead_tup        int8,
  last_vacuum       timestamptz,
  last_autovacuum   timestamptz,
  last_analyze      timestamptz,
  last_autoanalyze  timestamptz
);

comment on table internal.stat_tables_history is 'Historical snapshots of pg_stat_user_tables for table access pattern tracking';
comment on column internal.stat_tables_history.n_dead_tup is 'Dead tuples awaiting vacuum; high counts indicate vacuum lag';

-- ============================================================
-- stat_indexes_history
-- ============================================================
create table if not exists internal.stat_indexes_history
(
  id              int8 generated always as identity primary key,
  snapshot_id     int8 not null references internal.metric_snapshots(id) on delete cascade,
  schemaname      text,
  relname         text,
  indexrelname    text,
  idx_scan        int8,
  idx_tup_read    int8,
  idx_tup_fetch   int8
);

comment on table internal.stat_indexes_history is 'Historical snapshots of pg_stat_user_indexes for index usage tracking';
comment on column internal.stat_indexes_history.idx_scan is 'Number of index scans; zero across snapshots indicates an unused index';

-- ============================================================
-- stat_functions_history
-- ============================================================
create table if not exists internal.stat_functions_history
(
  id            int8 generated always as identity primary key,
  snapshot_id   int8 not null references internal.metric_snapshots(id) on delete cascade,
  schemaname    text,
  funcname      text,
  calls         int8,
  total_time    float8,
  self_time     float8
);

comment on table internal.stat_functions_history is 'Historical snapshots of pg_stat_user_functions for function performance tracking';
comment on column internal.stat_functions_history.self_time is 'Time spent in the function itself, excluding called functions';

-- ============================================================
-- stat_database_history
-- ============================================================
create table if not exists internal.stat_database_history
(
  id              int8 generated always as identity primary key,
  snapshot_id     int8 not null references internal.metric_snapshots(id) on delete cascade,
  numbackends     int4,
  xact_commit     int8,
  xact_rollback   int8,
  blks_read       int8,
  blks_hit        int8,
  tup_returned    int8,
  tup_fetched     int8,
  tup_inserted    int8,
  tup_updated     int8,
  tup_deleted     int8,
  deadlocks       int8,
  temp_files       int8,
  temp_bytes      int8
);

comment on table internal.stat_database_history is 'Historical snapshots of pg_stat_database for database-level performance tracking';
comment on column internal.stat_database_history.deadlocks is 'Number of deadlocks detected; non-zero warrants investigation';
