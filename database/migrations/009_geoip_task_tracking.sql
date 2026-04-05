-- 009_geoip_task_tracking.sql
-- Tables and functions for manual GeoIP update triggering with progress tracking.

-- Track manual GeoIP update runs (status lifecycle: pending → running → completed/failed)
create table if not exists internal.geoip_task_runs
(
  id              int4        generated always as identity primary key,
  task_arn        text,
  status          text        not null default 'pending',
  triggered_by    text        not null default 'manual',
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  error_message   text
);

comment on table internal.geoip_task_runs is 'Tracks manually triggered GeoIP update Fargate task runs';

-- Progress log lines emitted by the Docker container during a run
create table if not exists internal.geoip_task_progress
(
  id              int4        generated always as identity primary key,
  run_id          int4        not null references internal.geoip_task_runs(id),
  logged_at       timestamptz not null default now(),
  message         text        not null,
  level           text        not null default 'info'
);

comment on table internal.geoip_task_progress is 'Real-time progress lines for GeoIP update runs, written by Docker container';

create index idx_geoip_task_progress_run_id on internal.geoip_task_progress(run_id, id);


-- Paginated query on geoip_update_log (the historical success/failure log)
create or replace function api.get_geoip_update_logs(p_filters jsonb default '{}')
returns jsonb as $$
declare
  v_limit  int := coalesce((p_filters ->> 'limit')::int, 10);
  v_offset int := coalesce((p_filters ->> 'offset')::int, 0);
  v_logs   jsonb;
  v_total  int;
begin
  select count(*) into v_total
    from internal.geoip_update_log;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.updated_at desc), '[]'::jsonb)
    into v_logs
    from (
      select
        id,
        updated_at,
        network_rows,
        location_rows,
        duration_ms,
        last_modified,
        status
      from internal.geoip_update_log
      order by updated_at desc
      limit v_limit
      offset v_offset
    ) as t;

  return jsonb_build_object(
    'logs', v_logs,
    'total', v_total
  );
end;
$$ language plpgsql stable security definer
set search_path = internal;


-- Returns the latest task run with 30-min timeout logic
create or replace function api.get_geoip_task_status()
returns jsonb as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', r.id,
    'task_arn', r.task_arn,
    'status', case
      when r.status in ('pending', 'running')
        and r.started_at < now() - interval '30 minutes'
      then 'failed'
      else r.status
    end,
    'triggered_by', r.triggered_by,
    'started_at', r.started_at,
    'completed_at', r.completed_at,
    'error_message', case
      when r.status in ('pending', 'running')
        and r.started_at < now() - interval '30 minutes'
      then 'Task timed out after 30 minutes'
      else r.error_message
    end
  )
  into v_result
  from internal.geoip_task_runs as r
  order by r.started_at desc
  limit 1;

  return v_result;
end;
$$ language plpgsql stable security definer
set search_path = internal;


-- Create a new pending task run, returns {id: N}
create or replace function api.create_geoip_task_run(p_data jsonb default '{}')
returns jsonb as $$
declare
  v_id int;
begin
  insert into internal.geoip_task_runs (triggered_by)
  values (coalesce(p_data ->> 'triggered_by', 'manual'))
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end;
$$ language plpgsql security definer
set search_path = internal;


-- Update task run status (used by Docker container)
create or replace function api.update_geoip_task_run(p_data jsonb)
returns jsonb as $$
begin
  update internal.geoip_task_runs
  set
    status        = coalesce(p_data ->> 'status', status),
    task_arn      = coalesce(p_data ->> 'task_arn', task_arn),
    completed_at  = case
                      when p_data ->> 'status' in ('completed', 'failed')
                      then now()
                      else completed_at
                    end,
    error_message = coalesce(p_data ->> 'error_message', error_message)
  where id = (p_data ->> 'run_id')::int;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer
set search_path = internal;


-- Get progress lines for a run, optionally after a cursor id
create or replace function api.get_geoip_task_progress(p_filters jsonb default '{}')
returns jsonb as $$
declare
  v_run_id   int := (p_filters ->> 'run_id')::int;
  v_after_id int := coalesce((p_filters ->> 'after_id')::int, 0);
begin
  return coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'logged_at', p.logged_at,
        'message', p.message,
        'level', p.level
      ) order by p.id)
      from internal.geoip_task_progress as p
      where p.run_id = v_run_id
        and p.id > v_after_id
    ),
    '[]'::jsonb
  );
end;
$$ language plpgsql stable security definer
set search_path = internal;


-- Insert a progress line (used by Docker container)
create or replace function api.insert_geoip_task_progress(p_data jsonb)
returns jsonb as $$
declare
  v_id int;
begin
  insert into internal.geoip_task_progress (run_id, message, level)
  values (
    (p_data ->> 'run_id')::int,
    p_data ->> 'message',
    coalesce(p_data ->> 'level', 'info')
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end;
$$ language plpgsql security definer
set search_path = internal;
