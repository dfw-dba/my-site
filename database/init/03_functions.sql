-- 03_functions.sql
-- All stored functions live in the api schema and return JSONB.

-- ============================================================
--  RESUME FUNCTIONS
-- ============================================================

-- api.get_resume()
-- Returns full resume: sections + professional entries grouped by type.
create or replace function api.get_resume()
returns jsonb as $$
declare
    v_sections jsonb;
    v_entries  jsonb;
begin
    -- Collect all resume sections keyed by section_type
    select coalesce(jsonb_object_agg(rs.section_type, rs.content), '{}'::jsonb)
      into v_sections
      from internal.resume_sections as rs;

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


-- api.get_contact_info()
-- Returns the contact section content (linkedin, github, email, etc.).
create or replace function api.get_contact_info()
returns jsonb as $$
begin
    return coalesce(
    (
        select rs.content
          from internal.resume_sections as rs
         where rs.section_type = 'contact'
    ), '{}'::jsonb);
end;
$$ language plpgsql stable
security definer;


-- api.get_professional_timeline()
-- Returns all entries ordered by start_date DESC.
create or replace function api.get_professional_timeline()
returns jsonb as $$
begin
    return coalesce(
    (
        select jsonb_agg(
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
                'sort_order',   pe.sort_order
            ) order by pe.start_date desc
        )
        from internal.professional_entries as pe
    ), '[]'::jsonb);
end;
$$ language plpgsql stable
security definer;


-- api.upsert_professional_entry(p_data JSONB)
-- Insert or update a professional entry. If p_data contains an "id" key that
-- matches an existing row the row is updated; otherwise a new row is inserted.
create or replace function api.upsert_professional_entry(p_data jsonb)
returns jsonb as $$
declare
    v_id int4;
begin
    if p_data ? 'id' and p_data->>'id' is not null then
        update internal.professional_entries set
            entry_type   = coalesce(p_data->>'entry_type', entry_type),
            title        = coalesce(p_data->>'title', title),
            organization = coalesce(p_data->>'organization', organization),
            location     = p_data->>'location',
            start_date   = coalesce((p_data->>'start_date')::date, start_date),
            end_date     = (p_data->>'end_date')::date,
            description  = p_data->>'description',
            highlights   = coalesce(p_data->'highlights', highlights),
            technologies = coalesce(p_data->'technologies', technologies),
            sort_order   = coalesce((p_data->>'sort_order')::int4, sort_order),
            updated_at   = now()
        where id = (p_data->>'id')::int4
        returning id into v_id;
    else
        insert into internal.professional_entries
        (
            entry_type, title, organization, location,
            start_date, end_date, description, highlights, technologies, sort_order
        )
        values
        (
            p_data->>'entry_type',
            p_data->>'title',
            p_data->>'organization',
            p_data->>'location',
            (p_data->>'start_date')::date,
            (p_data->>'end_date')::date,
            p_data->>'description',
            coalesce(p_data->'highlights', '[]'::jsonb),
            coalesce(p_data->'technologies', '[]'::jsonb),
            coalesce((p_data->>'sort_order')::int4, 0)
        )
        returning id into v_id;
    end if;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;


-- api.upsert_resume_section(p_data JSONB)
-- Insert or update by section_type.
create or replace function api.upsert_resume_section(p_data jsonb)
returns jsonb as $$
declare
    v_id int2;
begin
    insert into internal.resume_sections (section_type, content)
    values
    (
        p_data->>'section_type',
        p_data->'content'
    )
    on conflict (section_type) do update set
        content    = excluded.content,
        updated_at = now()
    returning id into v_id;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;


-- api.delete_professional_entry(p_id int4)
create or replace function api.delete_professional_entry(p_id int4)
returns jsonb as $$
declare
    v_count int4;
begin
    delete from internal.professional_entries where id = p_id;
    get diagnostics v_count = row_count;

    return jsonb_build_object(
        'success', (v_count > 0)::boolean,
        'id',      p_id
    );
end;
$$ language plpgsql volatile
security definer;


-- api.upsert_performance_review(p_data JSONB)
-- Insert or update a performance review. If p_data contains an "id" key that
-- matches an existing row the row is updated; otherwise a new row is inserted.
create or replace function api.upsert_performance_review(p_data jsonb)
returns jsonb as $$
declare
    v_id int4;
begin
    if p_data ? 'id' and p_data->>'id' is not null then
        update internal.performance_reviews set
            entry_id       = coalesce((p_data->>'entry_id')::int4, entry_id),
            reviewer_name  = coalesce(p_data->>'reviewer_name', reviewer_name),
            reviewer_title = p_data->>'reviewer_title',
            review_date    = (p_data->>'review_date')::date,
            review_text    = coalesce(p_data->>'review_text', review_text),
            sort_order     = coalesce((p_data->>'sort_order')::int4, sort_order),
            updated_at     = now()
        where id = (p_data->>'id')::int4
        returning id into v_id;
    else
        insert into internal.performance_reviews
        (
            entry_id, reviewer_name, reviewer_title, review_date, review_text, sort_order
        )
        values
        (
            (p_data->>'entry_id')::int4,
            p_data->>'reviewer_name',
            p_data->>'reviewer_title',
            (p_data->>'review_date')::date,
            p_data->>'review_text',
            coalesce((p_data->>'sort_order')::int4, 0)
        )
        returning id into v_id;
    end if;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;


-- api.delete_performance_review(p_id int4)
create or replace function api.delete_performance_review(p_id int4)
returns jsonb as $$
declare
    v_count int4;
begin
    delete from internal.performance_reviews where id = p_id;
    get diagnostics v_count = row_count;

    return jsonb_build_object(
        'success', (v_count > 0)::boolean,
        'id',      p_id
    );
end;
$$ language plpgsql volatile
security definer;
