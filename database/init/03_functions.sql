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
            ) order by pe.sort_order asc
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
    v_level     text    := p_filters->>'level';
    v_search    text    := p_filters->>'search';
    v_client_ip text    := p_filters->>'client_ip';
    v_limit     int     := coalesce((p_filters->>'limit')::int, 100);
    v_offset    int     := coalesce((p_filters->>'offset')::int, 0);
    v_logs      jsonb;
    v_total     int;
begin
    -- Count total matching rows
    select count(*)
      into v_total
      from internal.app_logs as al
     where (v_level is null or al.level = v_level)
       and (v_search is null or al.message ilike '%' || v_search || '%'
            or al.request_path ilike '%' || v_search || '%')
       and (v_client_ip is null or al.client_ip = v_client_ip);

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
           and (v_client_ip is null or al.client_ip = v_client_ip)
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


-- api.get_threat_detections(p_filters JSONB)
-- Analyse app_logs for known threat patterns and return a day > hour > detail hierarchy.
create or replace function api.get_threat_detections(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_days      int          := coalesce((p_filters->>'days')::int, 30);
    v_client_ip text         := p_filters->>'client_ip';
    v_cutoff    timestamptz  := now() - make_interval(days => v_days);
begin
    return coalesce(
    (
        with threat_patterns as (
            select
                al.id,
                al.request_method,
                al.request_path,
                al.status_code,
                al.client_ip,
                al.message,
                al.created_at,
                case
                    when al.request_path ~* '(\.\./|%2e%2e|%252e)' then 'path_traversal'
                    when al.request_path ~* '(union\s+select|;\s*drop\s|;\s*delete\s|''\s*or\s+|1\s*=\s*1|%27|--\s*$)' then 'sql_injection'
                    when al.request_path ~* '/(\.env|\.git|\.aws|wp-admin|wp-login|wp-content|wp-includes|xmlrpc\.php|phpmyadmin|cgi-bin|actuator|telescope|elmah|trace\.axd|\.DS_Store|config\.php|admin\.php|setup\.php|install\.php|wp-config|\.htaccess|\.htpasswd|server-status|server-info)' then 'vulnerability_scan'
                    else null
                end as threat_type
            from internal.app_logs as al
            where al.created_at >= v_cutoff
              and al.request_path is not null
              and (v_client_ip is null or al.client_ip = v_client_ip)
        ),
        brute_force_ips as (
            select distinct al.client_ip
            from internal.app_logs as al
            where al.created_at >= v_cutoff
              and al.status_code in (401, 403)
              and al.client_ip is not null
              and (v_client_ip is null or al.client_ip = v_client_ip)
            group by al.client_ip, date_trunc('hour', al.created_at)
            having count(*) >= 5
        ),
        all_threats as (
            select
                tp.id, tp.request_method, tp.request_path, tp.status_code,
                tp.client_ip, tp.created_at, tp.threat_type
            from threat_patterns as tp
            where tp.threat_type is not null
            union all
            select
                al.id, al.request_method, al.request_path, al.status_code,
                al.client_ip, al.created_at,
                'brute_force'::text as threat_type
            from internal.app_logs as al
            inner join brute_force_ips as bf on al.client_ip = bf.client_ip
            where al.created_at >= v_cutoff
              and al.status_code in (401, 403)
              and (v_client_ip is null or al.client_ip = v_client_ip)
              and al.id not in (select tp.id from threat_patterns as tp where tp.threat_type is not null)
        ),
        daily as (
            select
                (at2.created_at at time zone 'UTC')::date as day,
                count(*)                                                           as total_threats,
                count(*) filter (where at2.threat_type = 'vulnerability_scan')     as vulnerability_scan,
                count(*) filter (where at2.threat_type = 'path_traversal')         as path_traversal,
                count(*) filter (where at2.threat_type = 'sql_injection')          as sql_injection,
                count(*) filter (where at2.threat_type = 'brute_force')            as brute_force,
                count(distinct at2.client_ip)                                      as unique_ips
            from all_threats as at2
            group by 1
        ),
        hourly as (
            select
                (at2.created_at at time zone 'UTC')::date                  as day,
                extract(hour from at2.created_at at time zone 'UTC')::int  as hour,
                count(*)                                                   as total_threats,
                jsonb_agg(
                    jsonb_build_object(
                        'id',             at2.id,
                        'threat_type',    at2.threat_type,
                        'request_method', at2.request_method,
                        'request_path',   at2.request_path,
                        'status_code',    at2.status_code,
                        'client_ip',      at2.client_ip,
                        'created_at',     at2.created_at
                    ) order by at2.created_at desc
                ) as details
            from all_threats as at2
            group by 1, 2
        )
        select jsonb_build_object(
            'days', coalesce(jsonb_agg(
                jsonb_build_object(
                    'date',               d.day,
                    'total_threats',       d.total_threats,
                    'vulnerability_scan',  d.vulnerability_scan,
                    'path_traversal',      d.path_traversal,
                    'sql_injection',       d.sql_injection,
                    'brute_force',         d.brute_force,
                    'unique_ips',          d.unique_ips,
                    'hours', (
                        select coalesce(jsonb_agg(
                            jsonb_build_object(
                                'hour',          h.hour,
                                'total_threats', h.total_threats,
                                'details',       h.details
                            ) order by h.hour
                        ), '[]'::jsonb)
                        from hourly as h
                        where h.day = d.day
                    )
                ) order by d.day desc
            ), '[]'::jsonb),
            'total_threats', (select coalesce(sum(d2.total_threats), 0) from daily as d2)
        )
        from daily as d
    ),
    jsonb_build_object('days', '[]'::jsonb, 'total_threats', 0));
end;
$$ language plpgsql stable
security definer;

comment on function api.get_threat_detections(jsonb) is
    'Analyse app_logs for known threat patterns (vulnerability scans, path traversal, SQL injection, brute force) and return a day > hour > detail hierarchy.';


-- api.maintenance_purge_logs()
-- Scheduled maintenance: delete logs older than 14 days.
create or replace function api.maintenance_purge_logs()
returns jsonb as $$
declare
    v_count int;
begin
    delete from internal.app_logs
     where created_at < now() - interval '14 days';

    get diagnostics v_count = row_count;

    return jsonb_build_object('deleted', v_count, 'success', true);
end;
$$ language plpgsql volatile
security definer;

comment on function api.maintenance_purge_logs() is
    'Scheduled maintenance: purge app_logs rows older than 14 days.';


-- ============================================================
--  DATABASE METRICS FUNCTIONS
-- ============================================================

-- api.capture_db_metrics(p_type text)
-- Snapshot all database performance stats into history tables.
create or replace function api.capture_db_metrics(p_type text default 'scheduled')
returns jsonb as $$
declare
    v_snapshot_id   int8;
    v_statements    int;
    v_tables        int;
    v_indexes       int;
    v_functions     int;
    v_database      int;
begin
    insert into internal.metric_snapshots (snapshot_type)
    values (p_type)
    returning id into v_snapshot_id;

    -- Snapshot pg_stat_statements
    insert into internal.stat_statements_history
        (snapshot_id, queryid, query, calls, total_exec_time, mean_exec_time,
         min_exec_time, max_exec_time, stddev_exec_time, rows,
         shared_blks_hit, shared_blks_read, temp_blks_written, wal_bytes)
    select
        v_snapshot_id, ss.queryid, ss.query, ss.calls,
        ss.total_exec_time, ss.mean_exec_time,
        ss.min_exec_time, ss.max_exec_time, ss.stddev_exec_time,
        ss.rows, ss.shared_blks_hit, ss.shared_blks_read,
        ss.temp_blks_written, ss.wal_bytes
    from pg_stat_statements as ss
    where ss.dbid = (select oid from pg_database where datname = current_database());
    get diagnostics v_statements = row_count;

    -- Snapshot pg_stat_user_tables
    insert into internal.stat_tables_history
        (snapshot_id, schemaname, relname, seq_scan, seq_tup_read, idx_scan,
         idx_tup_fetch, n_tup_ins, n_tup_upd, n_tup_del, n_dead_tup,
         last_vacuum, last_autovacuum, last_analyze, last_autoanalyze)
    select
        v_snapshot_id, st.schemaname, st.relname, st.seq_scan, st.seq_tup_read,
        st.idx_scan, st.idx_tup_fetch, st.n_tup_ins, st.n_tup_upd, st.n_tup_del,
        st.n_dead_tup, st.last_vacuum, st.last_autovacuum,
        st.last_analyze, st.last_autoanalyze
    from pg_stat_user_tables as st;
    get diagnostics v_tables = row_count;

    -- Snapshot pg_stat_user_indexes
    insert into internal.stat_indexes_history
        (snapshot_id, schemaname, relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch)
    select
        v_snapshot_id, si.schemaname, si.relname, si.indexrelname,
        si.idx_scan, si.idx_tup_read, si.idx_tup_fetch
    from pg_stat_user_indexes as si;
    get diagnostics v_indexes = row_count;

    -- Snapshot pg_stat_user_functions
    insert into internal.stat_functions_history
        (snapshot_id, schemaname, funcname, calls, total_time, self_time)
    select
        v_snapshot_id, sf.schemaname, sf.funcname,
        sf.calls, sf.total_time, sf.self_time
    from pg_stat_user_functions as sf;
    get diagnostics v_functions = row_count;

    -- Snapshot pg_stat_database (current database only)
    insert into internal.stat_database_history
        (snapshot_id, numbackends, xact_commit, xact_rollback, blks_read, blks_hit,
         tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted,
         deadlocks, temp_files, temp_bytes)
    select
        v_snapshot_id, sd.numbackends, sd.xact_commit, sd.xact_rollback,
        sd.blks_read, sd.blks_hit, sd.tup_returned, sd.tup_fetched,
        sd.tup_inserted, sd.tup_updated, sd.tup_deleted,
        sd.deadlocks, sd.temp_files, sd.temp_bytes
    from pg_stat_database as sd
    where sd.datname = current_database();
    get diagnostics v_database = row_count;

    return jsonb_build_object(
        'snapshot_id', v_snapshot_id,
        'success', true,
        'counts', jsonb_build_object(
            'statements', v_statements,
            'tables', v_tables,
            'indexes', v_indexes,
            'functions', v_functions,
            'database', v_database
        )
    );
end;
$$ language plpgsql volatile
security definer;

comment on function api.capture_db_metrics(text) is
    'Snapshot all database performance stats (statements, tables, indexes, functions, database) into history tables.';


-- api.get_db_overview(p_filters jsonb)
-- Database-level stats from latest snapshot with delta vs previous.
create or replace function api.get_db_overview(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_latest    record;
    v_previous  record;
    v_result    jsonb;
begin
    select sdh.*,
           ms.captured_at
      into v_latest
      from internal.stat_database_history as sdh
      inner join internal.metric_snapshots as ms on ms.id = sdh.snapshot_id
     order by ms.captured_at desc
     limit 1;

    if v_latest is null then
        return jsonb_build_object('message', 'No snapshots available');
    end if;

    select sdh.*,
           ms.captured_at
      into v_previous
      from internal.stat_database_history as sdh
      inner join internal.metric_snapshots as ms on ms.id = sdh.snapshot_id
     where ms.captured_at < v_latest.captured_at
     order by ms.captured_at desc
     limit 1;

    v_result := jsonb_build_object(
        'captured_at', v_latest.captured_at,
        'cache_hit_ratio', case
            when (v_latest.blks_hit + v_latest.blks_read) > 0
            then round((v_latest.blks_hit::numeric / (v_latest.blks_hit + v_latest.blks_read)) * 100, 2)
            else 0
        end,
        'numbackends', v_latest.numbackends,
        'xact_commit', v_latest.xact_commit,
        'xact_rollback', v_latest.xact_rollback,
        'deadlocks', v_latest.deadlocks,
        'temp_files', v_latest.temp_files,
        'temp_bytes', v_latest.temp_bytes,
        'tup_returned', v_latest.tup_returned,
        'tup_fetched', v_latest.tup_fetched,
        'tup_inserted', v_latest.tup_inserted,
        'tup_updated', v_latest.tup_updated,
        'tup_deleted', v_latest.tup_deleted
    );

    if v_previous is not null then
        v_result := v_result || jsonb_build_object(
            'delta', jsonb_build_object(
                'xact_commit', v_latest.xact_commit - v_previous.xact_commit,
                'xact_rollback', v_latest.xact_rollback - v_previous.xact_rollback,
                'deadlocks', v_latest.deadlocks - v_previous.deadlocks,
                'tup_inserted', v_latest.tup_inserted - v_previous.tup_inserted,
                'tup_updated', v_latest.tup_updated - v_previous.tup_updated,
                'tup_deleted', v_latest.tup_deleted - v_previous.tup_deleted
            )
        );
    end if;

    return v_result;
end;
$$ language plpgsql stable
security definer;

comment on function api.get_db_overview(jsonb) is
    'Database-level stats from latest snapshot: cache hit ratio, transaction rates, deadlocks, with delta vs previous snapshot.';


-- api.get_slow_queries(p_filters jsonb)
-- Top N queries by execution time from latest snapshot.
create or replace function api.get_slow_queries(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_sort_by   text := coalesce(p_filters->>'sort_by', 'total_exec_time');
    v_limit     int  := coalesce((p_filters->>'limit')::int, 20);
    v_min_calls int  := coalesce((p_filters->>'min_calls')::int, 1);
    v_snapshot_id int8;
    v_result    jsonb;
begin
    select ms.id into v_snapshot_id
      from internal.metric_snapshots as ms
     order by ms.captured_at desc
     limit 1;

    if v_snapshot_id is null then
        return jsonb_build_object('queries', '[]'::jsonb);
    end if;

    select coalesce(jsonb_agg(row_obj), '[]'::jsonb)
      into v_result
      from (
          select jsonb_build_object(
              'queryid', ssh.queryid,
              'query', ssh.query,
              'calls', ssh.calls,
              'total_exec_time', round(ssh.total_exec_time::numeric, 2),
              'mean_exec_time', round(ssh.mean_exec_time::numeric, 2),
              'min_exec_time', round(ssh.min_exec_time::numeric, 2),
              'max_exec_time', round(ssh.max_exec_time::numeric, 2),
              'stddev_exec_time', round(ssh.stddev_exec_time::numeric, 2),
              'rows', ssh.rows,
              'shared_blks_hit', ssh.shared_blks_hit,
              'shared_blks_read', ssh.shared_blks_read,
              'cache_hit_ratio', case
                  when (ssh.shared_blks_hit + ssh.shared_blks_read) > 0
                  then round((ssh.shared_blks_hit::numeric / (ssh.shared_blks_hit + ssh.shared_blks_read)) * 100, 2)
                  else 0
              end
          ) as row_obj
          from internal.stat_statements_history as ssh
         where ssh.snapshot_id = v_snapshot_id
           and ssh.calls >= v_min_calls
         order by
              case when v_sort_by = 'total_exec_time' then ssh.total_exec_time end desc nulls last,
              case when v_sort_by = 'mean_exec_time' then ssh.mean_exec_time end desc nulls last,
              case when v_sort_by = 'calls' then ssh.calls end desc nulls last
         limit v_limit
      ) as sub;

    return jsonb_build_object('queries', v_result);
end;
$$ language plpgsql stable
security definer;

comment on function api.get_slow_queries(jsonb) is
    'Top N queries by execution time from latest snapshot. Supports sort_by, limit, min_calls filters.';


-- api.get_plan_instability(p_filters jsonb)
-- Queries with high execution time variance indicating plan instability.
create or replace function api.get_plan_instability(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_limit     int := coalesce((p_filters->>'limit')::int, 20);
    v_min_calls int := coalesce((p_filters->>'min_calls')::int, 5);
    v_result    jsonb;
begin
    select coalesce(jsonb_agg(row_obj), '[]'::jsonb)
      into v_result
      from (
          select jsonb_build_object(
              'queryid', ssh.queryid,
              'query', ssh.query,
              'calls', ssh.calls,
              'mean_exec_time', round(ssh.mean_exec_time::numeric, 2),
              'stddev_exec_time', round(ssh.stddev_exec_time::numeric, 2),
              'min_exec_time', round(ssh.min_exec_time::numeric, 2),
              'max_exec_time', round(ssh.max_exec_time::numeric, 2),
              'instability_ratio', round((ssh.stddev_exec_time / nullif(ssh.mean_exec_time, 0))::numeric, 2),
              'max_mean_ratio', round((ssh.max_exec_time / nullif(ssh.mean_exec_time, 0))::numeric, 2),
              'captured_at', ms.captured_at
          ) as row_obj
          from internal.stat_statements_history as ssh
          inner join internal.metric_snapshots as ms on ms.id = ssh.snapshot_id
         where ssh.calls >= v_min_calls
           and ssh.mean_exec_time >= 0.1
           and ssh.query !~* '^\s*(begin|commit|rollback|set|reset|deallocate|discard|close|listen|unlisten|notify)\b'
           and (ssh.stddev_exec_time > ssh.mean_exec_time
                or ssh.max_exec_time > 10 * ssh.mean_exec_time)
         order by ssh.stddev_exec_time / nullif(ssh.mean_exec_time, 0) desc nulls last
         limit v_limit
      ) as sub;

    return jsonb_build_object('unstable_queries', v_result);
end;
$$ language plpgsql stable
security definer;

comment on function api.get_plan_instability(jsonb) is
    'Queries where stddev_exec_time > mean_exec_time or max > 10x mean, indicating parameter-driven plan changes.';


-- api.get_table_stats(p_filters jsonb)
-- Table access patterns from latest snapshot.
create or replace function api.get_table_stats(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_snapshot_id int8;
    v_result      jsonb;
begin
    select ms.id into v_snapshot_id
      from internal.metric_snapshots as ms
     order by ms.captured_at desc
     limit 1;

    if v_snapshot_id is null then
        return jsonb_build_object('tables', '[]'::jsonb);
    end if;

    select coalesce(jsonb_agg(row_obj), '[]'::jsonb)
      into v_result
      from (
          select jsonb_build_object(
              'schemaname', sth.schemaname,
              'relname', sth.relname,
              'seq_scan', sth.seq_scan,
              'seq_tup_read', sth.seq_tup_read,
              'idx_scan', sth.idx_scan,
              'idx_tup_fetch', sth.idx_tup_fetch,
              'seq_scan_ratio', case
                  when (sth.seq_scan + coalesce(sth.idx_scan, 0)) > 0
                  then round((sth.seq_scan::numeric / (sth.seq_scan + coalesce(sth.idx_scan, 0))) * 100, 2)
                  else 0
              end,
              'n_tup_ins', sth.n_tup_ins,
              'n_tup_upd', sth.n_tup_upd,
              'n_tup_del', sth.n_tup_del,
              'n_dead_tup', sth.n_dead_tup,
              'last_vacuum', sth.last_vacuum,
              'last_autovacuum', sth.last_autovacuum,
              'last_analyze', sth.last_analyze,
              'last_autoanalyze', sth.last_autoanalyze
          ) as row_obj
          from internal.stat_tables_history as sth
         where sth.snapshot_id = v_snapshot_id
         order by sth.seq_scan desc nulls last
      ) as sub;

    return jsonb_build_object('tables', v_result);
end;
$$ language plpgsql stable
security definer;

comment on function api.get_table_stats(jsonb) is
    'Table access patterns: seq vs idx scan ratios, dead tuples, vacuum timestamps from latest snapshot.';


-- api.get_index_usage(p_filters jsonb)
-- Index usage stats from latest snapshot.
create or replace function api.get_index_usage(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_snapshot_id int8;
    v_result      jsonb;
begin
    select ms.id into v_snapshot_id
      from internal.metric_snapshots as ms
     order by ms.captured_at desc
     limit 1;

    if v_snapshot_id is null then
        return jsonb_build_object('indexes', '[]'::jsonb);
    end if;

    select coalesce(jsonb_agg(row_obj), '[]'::jsonb)
      into v_result
      from (
          select jsonb_build_object(
              'schemaname', sih.schemaname,
              'relname', sih.relname,
              'indexrelname', sih.indexrelname,
              'idx_scan', sih.idx_scan,
              'idx_tup_read', sih.idx_tup_read,
              'idx_tup_fetch', sih.idx_tup_fetch,
              'is_unused', (sih.idx_scan = 0)
          ) as row_obj
          from internal.stat_indexes_history as sih
         where sih.snapshot_id = v_snapshot_id
         order by sih.idx_scan asc nulls first
      ) as sub;

    return jsonb_build_object('indexes', v_result);
end;
$$ language plpgsql stable
security definer;

comment on function api.get_index_usage(jsonb) is
    'Index usage: scan counts, unused index detection from latest snapshot.';


-- api.get_function_stats(p_filters jsonb)
-- Function performance stats from latest snapshot.
create or replace function api.get_function_stats(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_snapshot_id int8;
    v_result      jsonb;
begin
    select ms.id into v_snapshot_id
      from internal.metric_snapshots as ms
     order by ms.captured_at desc
     limit 1;

    if v_snapshot_id is null then
        return jsonb_build_object('functions', '[]'::jsonb);
    end if;

    select coalesce(jsonb_agg(row_obj), '[]'::jsonb)
      into v_result
      from (
          select jsonb_build_object(
              'schemaname', sfh.schemaname,
              'funcname', sfh.funcname,
              'calls', sfh.calls,
              'total_time', round(sfh.total_time::numeric, 2),
              'self_time', round(sfh.self_time::numeric, 2),
              'avg_time', case
                  when sfh.calls > 0 then round((sfh.total_time / sfh.calls)::numeric, 2)
                  else 0
              end
          ) as row_obj
          from internal.stat_functions_history as sfh
         where sfh.snapshot_id = v_snapshot_id
         order by sfh.total_time desc nulls last
      ) as sub;

    return jsonb_build_object('functions', v_result);
end;
$$ language plpgsql stable
security definer;

comment on function api.get_function_stats(jsonb) is
    'Function call counts, total/self time, avg time per call from latest snapshot.';


-- api.purge_metric_snapshots(p_days int)
-- Delete metric snapshots older than N days (cascades to all history tables).
create or replace function api.purge_metric_snapshots(p_days int default 30)
returns jsonb as $$
declare
    v_count int;
begin
    delete from internal.metric_snapshots
     where captured_at < now() - make_interval(days => p_days);

    get diagnostics v_count = row_count;

    return jsonb_build_object('deleted', v_count, 'success', true);
end;
$$ language plpgsql volatile
security definer;

comment on function api.purge_metric_snapshots(int) is
    'Delete metric snapshots older than N days; cascades to all history tables.';


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


-- ============================================================
--  ANALYTICS FUNCTIONS
-- ============================================================

-- api.geoip_lookup(p_ip text)
-- Look up country/region/city for an IP address from the geoip_ranges table.
create or replace function api.geoip_lookup(p_ip text)
returns jsonb as $$
declare
    v_result record;
begin
    select country_code, country_name, region, city
      into v_result
      from internal.geoip_ranges
     where p_ip::inet >= ip_start
       and p_ip::inet <= ip_end
     limit 1;

    if not found then
        return null;
    end if;

    return jsonb_build_object(
        'country_code', v_result.country_code,
        'country_name', v_result.country_name,
        'region', v_result.region,
        'city', v_result.city
    );
end;
$$ language plpgsql stable
security definer;

comment on function api.geoip_lookup(text) is
    'Look up geographic location for an IP address using the geoip_ranges table.';


-- api.insert_page_view(p_data jsonb)
-- Insert a page view record, enriching with GeoIP data if available.
create or replace function api.insert_page_view(p_data jsonb)
returns jsonb as $$
declare
    v_id int8;
    v_geo jsonb;
    v_country_code text;
    v_country_name text;
    v_region text;
    v_city text;
begin
    -- attempt GeoIP enrichment
    if p_data->>'client_ip' is not null then
        v_geo := api.geoip_lookup(p_data->>'client_ip');
        if v_geo is not null then
            v_country_code := v_geo->>'country_code';
            v_country_name := v_geo->>'country_name';
            v_region := v_geo->>'region';
            v_city := v_geo->>'city';
        end if;
    end if;

    insert into internal.page_views (
        visitor_hash, session_id, page_path, page_title,
        referrer, utm_source, utm_medium, utm_campaign,
        device_type, browser, os, screen_width, screen_height,
        language, timezone, client_ip,
        country_code, country_name, region, city, is_bot
    ) values (
        p_data->>'visitor_hash',
        p_data->>'session_id',
        p_data->>'page_path',
        p_data->>'page_title',
        p_data->>'referrer',
        p_data->>'utm_source',
        p_data->>'utm_medium',
        p_data->>'utm_campaign',
        p_data->>'device_type',
        p_data->>'browser',
        p_data->>'os',
        (p_data->>'screen_width')::int2,
        (p_data->>'screen_height')::int2,
        p_data->>'language',
        p_data->>'timezone',
        p_data->>'client_ip',
        v_country_code,
        v_country_name,
        v_region,
        v_city,
        coalesce((p_data->>'is_bot')::boolean, false)
    )
    returning id into v_id;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;

comment on function api.insert_page_view(jsonb) is
    'Insert a page view with automatic GeoIP enrichment when geoip_ranges data is available.';


-- api.insert_visitor_event(p_data jsonb)
-- Insert a visitor interaction event.
create or replace function api.insert_visitor_event(p_data jsonb)
returns jsonb as $$
declare
    v_id int8;
begin
    insert into internal.visitor_events (
        visitor_hash, session_id, event_type, event_data, page_path
    ) values (
        p_data->>'visitor_hash',
        p_data->>'session_id',
        p_data->>'event_type',
        coalesce(p_data->'event_data', '{}'),
        p_data->>'page_path'
    )
    returning id into v_id;

    return jsonb_build_object('id', v_id, 'success', true);
end;
$$ language plpgsql volatile
security definer;

comment on function api.insert_visitor_event(jsonb) is
    'Insert a visitor interaction event (click, scroll, print, visibility_change).';


-- api.get_analytics_summary(p_filters jsonb)
-- Dashboard overview: page views, unique visitors, sessions, top pages, referrers, device/browser/OS breakdown.
create or replace function api.get_analytics_summary(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_start timestamptz;
    v_end timestamptz;
    v_page_path text;
    v_exclude_bots boolean;
    v_totals jsonb;
    v_top_pages jsonb;
    v_top_referrers jsonb;
    v_devices jsonb;
    v_browsers jsonb;
    v_os_breakdown jsonb;
begin
    v_start := coalesce((p_filters->>'start_date')::timestamptz, now() - interval '30 days');
    v_end := coalesce((p_filters->>'end_date')::timestamptz, now());
    v_page_path := p_filters->>'page_path';
    v_exclude_bots := coalesce((p_filters->>'exclude_bots')::boolean, true);

    -- totals
    select jsonb_build_object(
        'total_page_views', count(*),
        'unique_visitors', count(distinct visitor_hash),
        'unique_sessions', count(distinct session_id)
    ) into v_totals
    from internal.page_views
    where created_at between v_start and v_end
      and (v_page_path is null or page_path = v_page_path)
      and (not v_exclude_bots or is_bot = false);

    -- top pages
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_top_pages
      from (
        select page_path, count(*) as views, count(distinct visitor_hash) as unique_visitors
          from internal.page_views
         where created_at between v_start and v_end
           and (not v_exclude_bots or is_bot = false)
         group by page_path
         order by views desc
         limit 20
      ) as t;

    -- top referrers
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_top_referrers
      from (
        select referrer, count(*) as views
          from internal.page_views
         where created_at between v_start and v_end
           and referrer is not null and referrer != ''
           and (not v_exclude_bots or is_bot = false)
         group by referrer
         order by views desc
         limit 20
      ) as t;

    -- device breakdown
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_devices
      from (
        select device_type, count(*) as count
          from internal.page_views
         where created_at between v_start and v_end
           and device_type is not null
           and (not v_exclude_bots or is_bot = false)
         group by device_type
         order by count desc
      ) as t;

    -- browser breakdown
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_browsers
      from (
        select browser, count(*) as count
          from internal.page_views
         where created_at between v_start and v_end
           and browser is not null
           and (not v_exclude_bots or is_bot = false)
         group by browser
         order by count desc
         limit 20
      ) as t;

    -- OS breakdown
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_os_breakdown
      from (
        select os, count(*) as count
          from internal.page_views
         where created_at between v_start and v_end
           and os is not null
           and (not v_exclude_bots or is_bot = false)
         group by os
         order by count desc
         limit 20
      ) as t;

    return v_totals || jsonb_build_object(
        'top_pages', v_top_pages,
        'top_referrers', v_top_referrers,
        'devices', v_devices,
        'browsers', v_browsers,
        'os_breakdown', v_os_breakdown,
        'date_range', jsonb_build_object('start', v_start, 'end', v_end)
    );
end;
$$ language plpgsql stable
security definer;

comment on function api.get_analytics_summary(jsonb) is
    'Dashboard overview: page views, unique visitors, sessions, top pages/referrers, device/browser/OS breakdown.';


-- api.get_analytics_visitors(p_filters jsonb)
-- Visitor-level data: pages per session, session duration, return visitors.
create or replace function api.get_analytics_visitors(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_start timestamptz;
    v_end timestamptz;
    v_exclude_bots boolean;
    v_top_sessions jsonb;
    v_return_visitors jsonb;
    v_session_stats jsonb;
begin
    v_start := coalesce((p_filters->>'start_date')::timestamptz, now() - interval '30 days');
    v_end := coalesce((p_filters->>'end_date')::timestamptz, now());
    v_exclude_bots := coalesce((p_filters->>'exclude_bots')::boolean, true);

    -- session-level stats
    select jsonb_build_object(
        'avg_pages_per_session', coalesce(round(avg(page_count), 1), 0),
        'total_sessions', count(*)
    ) into v_session_stats
    from (
        select session_id, count(*) as page_count
          from internal.page_views
         where created_at between v_start and v_end
           and (not v_exclude_bots or is_bot = false)
         group by session_id
    ) as s;

    -- top sessions by page count
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_top_sessions
      from (
        select
            pv.session_id,
            pv.visitor_hash,
            count(*) as page_count,
            min(pv.created_at) as first_view,
            max(pv.created_at) as last_view,
            extract(epoch from max(pv.created_at) - min(pv.created_at))::int as duration_seconds
          from internal.page_views as pv
         where pv.created_at between v_start and v_end
           and (not v_exclude_bots or pv.is_bot = false)
         group by pv.session_id, pv.visitor_hash
         order by page_count desc
         limit 50
      ) as t;

    -- return visitors (seen on multiple days)
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_return_visitors
      from (
        select
            visitor_hash,
            count(distinct date(created_at)) as days_visited,
            count(*) as total_views,
            min(created_at) as first_seen,
            max(created_at) as last_seen
          from internal.page_views
         where created_at between v_start and v_end
           and (not v_exclude_bots or is_bot = false)
         group by visitor_hash
        having count(distinct date(created_at)) > 1
         order by days_visited desc
         limit 50
      ) as t;

    return v_session_stats || jsonb_build_object(
        'top_sessions', v_top_sessions,
        'return_visitors', v_return_visitors,
        'date_range', jsonb_build_object('start', v_start, 'end', v_end)
    );
end;
$$ language plpgsql stable
security definer;

comment on function api.get_analytics_visitors(jsonb) is
    'Visitor-level analytics: session page counts, duration, return visitor detection.';


-- api.get_analytics_geo(p_filters jsonb)
-- Geographic breakdown of visitors by country, region, city.
create or replace function api.get_analytics_geo(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_start timestamptz;
    v_end timestamptz;
    v_exclude_bots boolean;
    v_countries jsonb;
    v_regions jsonb;
    v_cities jsonb;
begin
    v_start := coalesce((p_filters->>'start_date')::timestamptz, now() - interval '30 days');
    v_end := coalesce((p_filters->>'end_date')::timestamptz, now());
    v_exclude_bots := coalesce((p_filters->>'exclude_bots')::boolean, true);

    -- by country
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_countries
      from (
        select country_code, country_name, count(*) as views, count(distinct visitor_hash) as unique_visitors
          from internal.page_views
         where created_at between v_start and v_end
           and country_code is not null
           and (not v_exclude_bots or is_bot = false)
         group by country_code, country_name
         order by views desc
         limit 50
      ) as t;

    -- by region
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_regions
      from (
        select country_code, region, count(*) as views, count(distinct visitor_hash) as unique_visitors
          from internal.page_views
         where created_at between v_start and v_end
           and region is not null
           and (not v_exclude_bots or is_bot = false)
         group by country_code, region
         order by views desc
         limit 50
      ) as t;

    -- by city
    select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]')
      into v_cities
      from (
        select country_code, region, city, count(*) as views, count(distinct visitor_hash) as unique_visitors
          from internal.page_views
         where created_at between v_start and v_end
           and city is not null
           and (not v_exclude_bots or is_bot = false)
         group by country_code, region, city
         order by views desc
         limit 50
      ) as t;

    return jsonb_build_object(
        'countries', v_countries,
        'regions', v_regions,
        'cities', v_cities,
        'date_range', jsonb_build_object('start', v_start, 'end', v_end)
    );
end;
$$ language plpgsql stable
security definer;

comment on function api.get_analytics_geo(jsonb) is
    'Geographic breakdown of visitors by country, region, and city.';


-- api.get_analytics_timeseries(p_filters jsonb)
-- Daily page view and unique visitor counts for time series charts.
create or replace function api.get_analytics_timeseries(p_filters jsonb default '{}')
returns jsonb as $$
declare
    v_start timestamptz;
    v_end timestamptz;
    v_exclude_bots boolean;
    v_daily jsonb;
begin
    v_start := coalesce((p_filters ->> 'start_date')::timestamptz, now() - interval '30 days');
    v_end := coalesce((p_filters ->> 'end_date')::timestamptz, now());
    v_exclude_bots := coalesce((p_filters ->> 'exclude_bots')::boolean, true);

    select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.date), '[]')
      into v_daily
      from (
        select date(created_at) as date,
               count(*) as views,
               count(distinct visitor_hash) as unique_visitors
          from internal.page_views
         where created_at between v_start and v_end
           and (not v_exclude_bots or is_bot = false)
         group by date(created_at)
      ) as t;

    return jsonb_build_object('daily', v_daily);
end;
$$ language plpgsql stable
security definer;

comment on function api.get_analytics_timeseries(jsonb) is
    'Daily page view and unique visitor time series data.';


-- api.purge_analytics(p_days int)
-- Delete page_views and visitor_events older than N days.
create or replace function api.purge_analytics(p_days int default 90)
returns jsonb as $$
declare
    v_views_count int;
    v_events_count int;
begin
    delete from internal.page_views
     where created_at < now() - make_interval(days => p_days);
    get diagnostics v_views_count = row_count;

    delete from internal.visitor_events
     where created_at < now() - make_interval(days => p_days);
    get diagnostics v_events_count = row_count;

    return jsonb_build_object(
        'page_views_deleted', v_views_count,
        'visitor_events_deleted', v_events_count,
        'success', true
    );
end;
$$ language plpgsql volatile
security definer;

comment on function api.purge_analytics(int) is
    'Delete page views and visitor events older than N days.';
