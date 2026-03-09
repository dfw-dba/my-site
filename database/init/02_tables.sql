-- 02_tables.sql
-- All tables live in the internal schema.

-- ============================================================
-- professional_entries
-- ============================================================
create table internal.professional_entries
(
  id           int4 generated always as identity primary key,
  entry_type   text not null check (entry_type in ('work', 'education', 'certification', 'award')),
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
comment on column internal.professional_entries.entry_type is 'One of: work, education, certification, award';
comment on column internal.professional_entries.highlights is 'JSON array of bullet-point strings';
comment on column internal.professional_entries.technologies is 'JSON array of technology name strings';

-- ============================================================
-- resume_sections
-- ============================================================
create table internal.resume_sections
(
  id           int2 generated always as identity primary key,
  section_type text unique not null check (section_type in ('summary', 'contact', 'recommendations')),
  content      jsonb not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table internal.resume_sections is 'Free-form resume sections keyed by type (summary, contact, recommendations)';
comment on column internal.resume_sections.section_type is 'One of: summary, contact, recommendations';
comment on column internal.resume_sections.content is 'JSONB content whose structure varies by section_type';

-- ============================================================
-- performance_reviews
-- ============================================================
create table internal.performance_reviews
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
