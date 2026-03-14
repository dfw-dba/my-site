-- 02_tables.sql
-- All tables live in the internal schema.

-- ============================================================
-- professional_entries
-- ============================================================
create table if not exists internal.professional_entries
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
  sort_order   int4 default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table internal.resume_recommendations is 'LinkedIn recommendations displayed on the resume page';
comment on column internal.resume_recommendations.author is 'Name of the person who wrote the recommendation';
comment on column internal.resume_recommendations.title is 'Job title of the recommender';
comment on column internal.resume_recommendations.text is 'Full text of the recommendation';
comment on column internal.resume_recommendations.sort_order is 'Display order; lower values appear first';

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
