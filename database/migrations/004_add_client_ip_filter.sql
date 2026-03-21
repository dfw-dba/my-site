-- 004_add_client_ip_filter.sql
-- Add client_ip filter support to get_app_logs and get_threat_detections functions.

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
