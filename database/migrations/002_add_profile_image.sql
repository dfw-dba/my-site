-- 002_add_profile_image.sql
-- Adds single-row table for storing the resume profile image URL.

create table if not exists internal.resume_profile_image
(
  id           int4 generated always as identity primary key,
  image_url    text not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table internal.resume_profile_image is 'Single-row table holding the profile image URL for the resume page';
comment on column internal.resume_profile_image.image_url is 'Public URL of the uploaded profile image';


-- api.upsert_resume_profile_image(p_data jsonb)
-- Upsert the single profile image row.
create or replace function api.upsert_resume_profile_image(p_data jsonb)
returns jsonb as $$
declare
    v_id int4;
begin
    if exists (select 1 from internal.resume_profile_image limit 1) then
        update internal.resume_profile_image set
            image_url  = coalesce(p_data->>'image_url', image_url),
            updated_at = now()
        returning id into v_id;
    else
        insert into internal.resume_profile_image (image_url)
        values (p_data->>'image_url')
        returning id into v_id;
    end if;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;


-- Update api.get_resume() to include profile_image section.
create or replace function api.get_resume()
returns jsonb as $$
declare
    v_sections      jsonb;
    v_entries       jsonb;
    v_title         jsonb;
    v_summary       jsonb;
    v_contact       jsonb;
    v_recs          jsonb;
    v_profile_image jsonb;
begin
    -- Build title section
    select jsonb_build_object(
               'title', rt.title
           )
      into v_title
      from internal.resume_title as rt
     limit 1;

    -- Build summary section
    select jsonb_build_object(
               'headline', rs.headline,
               'text',     rs.text
           )
      into v_summary
      from internal.resume_summary as rs
     limit 1;

    -- Build contact section
    select jsonb_build_object(
               'linkedin', rc.linkedin,
               'github',   rc.github,
               'email',    rc.email
           )
      into v_contact
      from internal.resume_contact as rc
     limit 1;

    -- Build recommendations section
    select jsonb_build_object(
               'items', coalesce(jsonb_agg(
                   jsonb_build_object(
                       'author', rr.author,
                       'title',  rr.title,
                       'text',   rr.text
                   ) order by rr.sort_order
               ), '[]'::jsonb)
           )
      into v_recs
      from internal.resume_recommendations as rr;

    -- Build profile image section
    select jsonb_build_object(
               'image_url', rpi.image_url
           )
      into v_profile_image
      from internal.resume_profile_image as rpi
     limit 1;

    -- Assemble sections object
    v_sections := '{}'::jsonb;
    if v_title is not null then
        v_sections := v_sections || jsonb_build_object('title', v_title);
    end if;
    if v_summary is not null then
        v_sections := v_sections || jsonb_build_object('summary', v_summary);
    end if;
    if v_contact is not null then
        v_sections := v_sections || jsonb_build_object('contact', v_contact);
    end if;
    if v_recs is not null then
        v_sections := v_sections || jsonb_build_object('recommendations', v_recs);
    end if;
    if v_profile_image is not null then
        v_sections := v_sections || jsonb_build_object('profile_image', v_profile_image);
    end if;

    -- Collect professional entries grouped by entry_type
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

    return jsonb_build_object(
        'sections', v_sections,
        'entries',  v_entries
    );
end;
$$ language plpgsql stable
security definer;
