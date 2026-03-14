-- 001_normalize_resume_sections.sql
-- Migrates the polymorphic resume_sections table into three typed tables.
-- Run once against production, then drop the old table.

begin;

-- ============================================================
-- 1. Create new tables
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
-- 2. Migrate data from resume_sections
-- ============================================================

-- Summary
insert into internal.resume_summary (headline, text)
select
    content->>'headline',
    content->>'text'
from internal.resume_sections
where section_type = 'summary';

-- Contact
insert into internal.resume_contact (linkedin, github, email)
select
    content->>'linkedin',
    content->>'github',
    content->>'email'
from internal.resume_sections
where section_type = 'contact';

-- Recommendations
insert into internal.resume_recommendations (author, title, text, sort_order)
select
    item->>'author',
    item->>'title',
    item->>'text',
    row_number() over ()::int4
from internal.resume_sections,
     jsonb_array_elements(content->'items') as item
where section_type = 'recommendations';

-- ============================================================
-- 3. Drop old table
-- ============================================================
drop table if exists internal.resume_sections;

-- ============================================================
-- 4. Drop old function
-- ============================================================
drop function if exists api.upsert_resume_section(jsonb);

-- ============================================================
-- 5. Replace functions (see 03_functions.sql for full definitions)
-- ============================================================

create or replace function api.get_resume()
returns jsonb as $$
declare
    v_sections jsonb;
    v_entries  jsonb;
    v_summary  jsonb;
    v_contact  jsonb;
    v_recs     jsonb;
begin
    select jsonb_build_object('headline', rs.headline, 'text', rs.text)
      into v_summary
      from internal.resume_summary as rs
     limit 1;

    select jsonb_build_object('linkedin', rc.linkedin, 'github', rc.github, 'email', rc.email)
      into v_contact
      from internal.resume_contact as rc
     limit 1;

    select jsonb_build_object(
               'items', coalesce(jsonb_agg(
                   jsonb_build_object('author', rr.author, 'title', rr.title, 'text', rr.text)
                   order by rr.sort_order
               ), '[]'::jsonb)
           )
      into v_recs
      from internal.resume_recommendations as rr;

    v_sections := '{}'::jsonb;
    if v_summary is not null then
        v_sections := v_sections || jsonb_build_object('summary', v_summary);
    end if;
    if v_contact is not null then
        v_sections := v_sections || jsonb_build_object('contact', v_contact);
    end if;
    if v_recs is not null then
        v_sections := v_sections || jsonb_build_object('recommendations', v_recs);
    end if;

    select coalesce(jsonb_object_agg(sub.entry_type, sub.items), '{}'::jsonb)
      into v_entries
      from
      (
          select
            pe.entry_type,
            jsonb_agg(
                jsonb_build_object(
                    'id',           pe.id,
                    'entry_type',   pe.entry_type,
                    'title',        pe.title,
                    'organization', pe.organization,
                    'location',     pe.location,
                    'start_date',   pe.start_date,
                    'end_date',     pe.end_date,
                    'description',  pe.description,
                    'highlights',   pe.highlights,
                    'technologies', pe.technologies,
                    'sort_order',   pe.sort_order,
                    'performance_reviews', coalesce(pr_agg.reviews, '[]'::jsonb)
                ) order by pe.sort_order, pe.start_date desc
            ) as items
          from internal.professional_entries as pe
          left join lateral
          (
              select jsonb_agg(
                  jsonb_build_object(
                      'id',             pr.id,
                      'reviewer_name',  pr.reviewer_name,
                      'reviewer_title', pr.reviewer_title,
                      'review_date',    pr.review_date,
                      'text',           pr.review_text
                  ) order by pr.sort_order, pr.review_date desc nulls last
              ) as reviews
              from internal.performance_reviews as pr
              where pr.entry_id = pe.id
          ) as pr_agg on true
          group by pe.entry_type
      ) as sub;

    return jsonb_build_object('sections', v_sections, 'entries', v_entries);
end;
$$ language plpgsql stable
security definer;


create or replace function api.get_contact_info()
returns jsonb as $$
begin
    return coalesce(
    (
        select jsonb_build_object('linkedin', rc.linkedin, 'github', rc.github, 'email', rc.email)
          from internal.resume_contact as rc
         limit 1
    ), '{}'::jsonb);
end;
$$ language plpgsql stable
security definer;


create or replace function api.upsert_resume_summary(p_data jsonb)
returns jsonb as $$
declare
    v_id int4;
begin
    if exists (select 1 from internal.resume_summary limit 1) then
        update internal.resume_summary set
            headline   = p_data->>'headline',
            text       = coalesce(p_data->>'text', text),
            updated_at = now()
        returning id into v_id;
    else
        insert into internal.resume_summary (headline, text)
        values (p_data->>'headline', p_data->>'text')
        returning id into v_id;
    end if;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;


create or replace function api.upsert_resume_contact(p_data jsonb)
returns jsonb as $$
declare
    v_id int4;
begin
    if exists (select 1 from internal.resume_contact limit 1) then
        update internal.resume_contact set
            linkedin   = p_data->>'linkedin',
            github     = p_data->>'github',
            email      = p_data->>'email',
            updated_at = now()
        returning id into v_id;
    else
        insert into internal.resume_contact (linkedin, github, email)
        values (p_data->>'linkedin', p_data->>'github', p_data->>'email')
        returning id into v_id;
    end if;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;


create or replace function api.replace_resume_recommendations(p_items jsonb)
returns jsonb as $$
declare
    v_count int4;
begin
    delete from internal.resume_recommendations;

    insert into internal.resume_recommendations (author, title, text, sort_order)
    select
        item->>'author',
        item->>'title',
        item->>'text',
        row_number() over ()::int4
    from jsonb_array_elements(p_items) as item;

    get diagnostics v_count = row_count;

    return jsonb_build_object('count', v_count, 'success', true);
end;
$$ language plpgsql volatile
security definer;

commit;
