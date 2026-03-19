-- 000_seed_existing_migrations.sql
-- Seeds schema_migrations with records for migrations that were applied
-- manually before the automated migration system existed.

insert into internal.schema_migrations (filename)
select '001_normalize_resume_sections.sql'
where not exists (
  select 1 from internal.schema_migrations
  where filename = '001_normalize_resume_sections.sql'
);

insert into internal.schema_migrations (filename)
select '002_add_profile_image.sql'
where not exists (
  select 1 from internal.schema_migrations
  where filename = '002_add_profile_image.sql'
);

insert into internal.schema_migrations (filename)
select '003_add_recommendation_linkedin_url.sql'
where not exists (
  select 1 from internal.schema_migrations
  where filename = '003_add_recommendation_linkedin_url.sql'
);
