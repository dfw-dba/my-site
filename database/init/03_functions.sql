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
                       'author',       rr.author,
                       'title',        rr.title,
                       'text',         rr.text,
                       'linkedin_url', rr.linkedin_url
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


-- api.get_contact_info()
-- Returns the contact info (linkedin, github, email).
create or replace function api.get_contact_info()
returns jsonb as $$
begin
    return coalesce(
    (
        select jsonb_build_object(
                   'linkedin', rc.linkedin,
                   'github',   rc.github,
                   'email',    rc.email
               )
          from internal.resume_contact as rc
         limit 1
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


-- api.upsert_resume_summary(p_data JSONB)
-- Upsert the single summary row.
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


-- api.upsert_resume_title(p_data JSONB)
-- Upsert the single title row.
create or replace function api.upsert_resume_title(p_data jsonb)
returns jsonb as $$
declare
    v_id int4;
begin
    if exists (select 1 from internal.resume_title limit 1) then
        update internal.resume_title set
            title      = coalesce(p_data->>'title', title),
            updated_at = now()
        returning id into v_id;
    else
        insert into internal.resume_title (title)
        values (p_data->>'title')
        returning id into v_id;
    end if;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;


-- api.upsert_resume_contact(p_data JSONB)
-- Upsert the single contact row.
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


-- api.replace_resume_recommendations(p_items JSONB)
-- Delete all existing recommendations and insert from the provided JSON array.
create or replace function api.replace_resume_recommendations(p_items jsonb)
returns jsonb as $$
declare
    v_count int4;
begin
    delete from internal.resume_recommendations;

    insert into internal.resume_recommendations (author, title, text, linkedin_url, sort_order)
    select
        item->>'author',
        item->>'title',
        item->>'text',
        item->>'linkedin_url',
        row_number() over ()::int4
    from jsonb_array_elements(p_items) as item;

    get diagnostics v_count = row_count;

    return jsonb_build_object('count', v_count, 'success', true);
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


-- ============================================================
--  APP LOG FUNCTIONS
-- ============================================================

-- api.insert_app_log(p_data JSONB)
-- Insert a single application log row.
create or replace function api.insert_app_log(p_data jsonb)
returns jsonb as $$
declare
    v_id int8;
begin
    insert into internal.app_logs
    (
        level, message, logger, request_method, request_path,
        status_code, duration_ms, client_ip, error_detail, extra
    )
    values
    (
        p_data->>'level',
        p_data->>'message',
        p_data->>'logger',
        p_data->>'request_method',
        p_data->>'request_path',
        (p_data->>'status_code')::int2,
        (p_data->>'duration_ms')::int4,
        p_data->>'client_ip',
        p_data->>'error_detail',
        coalesce(p_data->'extra', '{}'::jsonb)
    )
    returning id into v_id;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;


-- api.get_app_logs(p_filters JSONB)
-- Paginated log query with optional level and search filters.
create or replace function api.get_app_logs(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_level  text    := p_filters->>'level';
    v_search text    := p_filters->>'search';
    v_limit  int     := coalesce((p_filters->>'limit')::int, 100);
    v_offset int     := coalesce((p_filters->>'offset')::int, 0);
    v_logs   jsonb;
    v_total  int;
begin
    -- Count total matching rows
    select count(*)
      into v_total
      from internal.app_logs as al
     where (v_level is null or al.level = v_level)
       and (v_search is null or al.message ilike '%' || v_search || '%'
            or al.request_path ilike '%' || v_search || '%');

    -- Fetch page
    select coalesce(jsonb_agg(row_obj order by id desc), '[]'::jsonb)
      into v_logs
      from
      (
          select jsonb_build_object(
              'id',             al.id,
              'level',          al.level,
              'message',        al.message,
              'logger',         al.logger,
              'request_method', al.request_method,
              'request_path',   al.request_path,
              'status_code',    al.status_code,
              'duration_ms',    al.duration_ms,
              'client_ip',      al.client_ip,
              'error_detail',   al.error_detail,
              'extra',          al.extra,
              'created_at',     al.created_at
          ) as row_obj,
          al.id
          from internal.app_logs as al
         where (v_level is null or al.level = v_level)
           and (v_search is null or al.message ilike '%' || v_search || '%'
                or al.request_path ilike '%' || v_search || '%')
         order by al.id desc
         limit v_limit
        offset v_offset
      ) as sub;

    return jsonb_build_object('logs', v_logs, 'total', v_total);
end;
$$ language plpgsql stable
security definer;


-- api.get_app_log_stats()
-- Dashboard summary stats for the last 24 hours.
create or replace function api.get_app_log_stats()
returns jsonb as $$
declare
    v_cutoff timestamptz := now() - interval '24 hours';
begin
    return
    (
        select jsonb_build_object(
            'total_24h',      count(*),
            'errors_24h',     count(*) filter (where al.level = 'ERROR'),
            'warnings_24h',   count(*) filter (where al.level = 'WARNING'),
            'avg_duration_ms', coalesce(round(avg(al.duration_ms))::int, 0)
        )
        from internal.app_logs as al
        where al.created_at >= v_cutoff
    );
end;
$$ language plpgsql stable
security definer;


-- api.purge_app_logs(p_days int)
-- Delete logs older than N days, return count deleted.
create or replace function api.purge_app_logs(p_days int)
returns jsonb as $$
declare
    v_count int;
begin
    delete from internal.app_logs
     where created_at < now() - make_interval(days => p_days);

    get diagnostics v_count = row_count;

    return jsonb_build_object('deleted', v_count, 'success', true);
end;
$$ language plpgsql volatile
security definer;


-- api.upsert_resume_profile_image(p_data JSONB)
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
