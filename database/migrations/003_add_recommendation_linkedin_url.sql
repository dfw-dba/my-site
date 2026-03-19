-- 003_add_recommendation_linkedin_url.sql
-- Add linkedin_url column to resume_recommendations for linking to recommender profiles.

alter table internal.resume_recommendations
  add column if not exists linkedin_url text;

comment on column internal.resume_recommendations.linkedin_url
  is 'LinkedIn profile URL of the recommender';
