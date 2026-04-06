-- 011_consolidate_geoip_tables.sql
-- Consolidate geoip_task_runs, geoip_task_progress, and geoip_update_log into
-- a single append-only log table. Add geoip_schedule table for runtime schedule management.

-- ============================================================================
-- 1. New sequence for run IDs (shared across all entries in a run)
-- ============================================================================
create sequence if not exists internal.geoip_run_id_seq;


-- ============================================================================
-- 2. Consolidated append-only log table
-- ============================================================================
create table internal.geoip_update_log_v2
(
  id              int4        generated always as identity primary key,
  run_id          int4        not null,
  logged_at       timestamptz not null default now(),
  message         text,
  level           text        not null default 'info',
  -- lifecycle fields (null for pure progress entries)
  status          text,
  triggered_by    text,
  task_arn        text,
  error_message   text,
  -- completion stats (set on final entry only)
  network_rows    int4,
  location_rows   int4,
  duration_ms     int4,
  last_modified   text
);

comment on table internal.geoip_update_log_v2 is
    'Append-only log for GeoIP update runs: lifecycle events, progress lines, and completion stats';
comment on column internal.geoip_update_log_v2.run_id is
    'Groups all entries belonging to the same update run';
comment on column internal.geoip_update_log_v2.status is
    'Run lifecycle status (pending/running/completed/failed/success); null for progress entries';
comment on column internal.geoip_update_log_v2.triggered_by is
    'Who initiated the run: manual or scheduled; set on lifecycle entries';

create index idx_geoip_update_log_v2_run
    on internal.geoip_update_log_v2(run_id, id);

create index idx_geoip_update_log_v2_status
    on internal.geoip_update_log_v2(run_id desc, id desc)
    where status is not null;


-- ============================================================================
-- 3. Schedule table (single-row, runtime-editable)
-- ============================================================================
create table internal.geoip_schedule
(
  id              int4        generated always as identity primary key,
  cron_expression text        not null default 'cron(0 6 ? * WED,SAT *)',
  description     text        not null default 'Wednesday, Saturday at 06:00 UTC',
  updated_at      timestamptz not null default now(),
  updated_by      text        not null default 'system'
);

comment on table internal.geoip_schedule is
    'Current EventBridge schedule for automated GeoIP refreshes (single row)';

insert into internal.geoip_schedule (cron_expression, description, updated_by)
values ('cron(0 6 ? * WED,SAT *)', 'Wednesday, Saturday at 06:00 UTC', 'system');


-- ============================================================================
-- 4. Data migration
-- ============================================================================

-- 4a. Migrate task runs that have a matching update_log entry (completed manual runs)
insert into internal.geoip_update_log_v2
    (run_id, logged_at, message, level, status, triggered_by, task_arn,
     error_message, network_rows, location_rows, duration_ms, last_modified)
select
    r.id,
    coalesce(l.updated_at, r.completed_at, r.started_at),
    coalesce(l.last_message, 'Run ' || r.status),
    'info',
    coalesce(l.status, r.status),
    r.triggered_by,
    r.task_arn,
    r.error_message,
    l.network_rows,
    l.location_rows,
    l.duration_ms,
    l.last_modified
from internal.geoip_task_runs as r
left join internal.geoip_update_log as l
    on l.run_id = r.id
order by r.id;

-- 4b. Migrate task progress entries
insert into internal.geoip_update_log_v2
    (run_id, logged_at, message, level)
select
    p.run_id,
    p.logged_at,
    p.message,
    p.level
from internal.geoip_task_progress as p
order by p.id;

-- 4c. Migrate update_log entries with no run_id (scheduled runs that predate task tracking)
insert into internal.geoip_update_log_v2
    (run_id, logged_at, message, level, status, triggered_by,
     network_rows, location_rows, duration_ms, last_modified)
select
    nextval('internal.geoip_run_id_seq'),
    l.updated_at,
    coalesce(l.last_message, 'Scheduled update ' || l.status),
    'info',
    l.status,
    'scheduled',
    l.network_rows,
    l.location_rows,
    l.duration_ms,
    l.last_modified
from internal.geoip_update_log as l
where l.run_id is null
order by l.id;

-- 4d. Sync the sequence past all migrated run_ids
select setval(
    'internal.geoip_run_id_seq',
    greatest(
        (select coalesce(max(run_id), 0) from internal.geoip_update_log_v2),
        currval('internal.geoip_run_id_seq')
    )
);


-- ============================================================================
-- 5. Drop old functions
-- ============================================================================
drop function if exists api.get_geoip_update_logs(jsonb);
drop function if exists api.get_geoip_task_status();
drop function if exists api.create_geoip_task_run(jsonb);
drop function if exists api.update_geoip_task_run(jsonb);
drop function if exists api.get_geoip_task_progress(jsonb);
drop function if exists api.insert_geoip_task_progress(jsonb);


-- ============================================================================
-- 6. Drop old tables (order matters for FK constraints)
-- ============================================================================
drop table if exists internal.geoip_task_progress;
drop table if exists internal.geoip_update_log;
drop table if exists internal.geoip_task_runs;


-- ============================================================================
-- 7. Rename consolidated table
-- ============================================================================
alter table internal.geoip_update_log_v2 rename to geoip_update_log;
alter index internal.idx_geoip_update_log_v2_run rename to idx_geoip_update_log_run;
alter index internal.idx_geoip_update_log_v2_status rename to idx_geoip_update_log_status;


-- ============================================================================
-- 8. New API functions
-- ============================================================================

-- Create a new run, returns {run_id: N}
create or replace function api.create_geoip_run(p_data jsonb default '{}')
returns jsonb as $$
declare
  v_run_id int;
begin
  v_run_id := nextval('internal.geoip_run_id_seq');

  insert into internal.geoip_update_log
      (run_id, message, level, status, triggered_by)
  values (
      v_run_id,
      'Run started',
      'info',
      'pending',
      coalesce(p_data ->> 'triggered_by', 'manual')
  );

  return jsonb_build_object('run_id', v_run_id);
end;
$$ language plpgsql security definer
set search_path = internal;


-- Insert a lifecycle event (status change, completion stats)
create or replace function api.update_geoip_run(p_data jsonb)
returns jsonb as $$
begin
  insert into internal.geoip_update_log
      (run_id, message, level, status, triggered_by, task_arn, error_message,
       network_rows, location_rows, duration_ms, last_modified)
  values (
      (p_data ->> 'run_id')::int,
      coalesce(p_data ->> 'message', 'Status: ' || coalesce(p_data ->> 'status', 'unknown')),
      coalesce(p_data ->> 'level', 'info'),
      p_data ->> 'status',
      p_data ->> 'triggered_by',
      p_data ->> 'task_arn',
      p_data ->> 'error_message',
      (p_data ->> 'network_rows')::int,
      (p_data ->> 'location_rows')::int,
      (p_data ->> 'duration_ms')::int,
      p_data ->> 'last_modified'
  );

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer
set search_path = internal;


-- Insert a progress line
create or replace function api.insert_geoip_run_progress(p_data jsonb)
returns jsonb as $$
declare
  v_id int;
begin
  insert into internal.geoip_update_log
      (run_id, message, level)
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


-- Get progress lines for a run (cursor-based pagination)
create or replace function api.get_geoip_run_progress(p_filters jsonb default '{}')
returns jsonb as $$
declare
  v_run_id   int := (p_filters ->> 'run_id')::int;
  v_after_id int := coalesce((p_filters ->> 'after_id')::int, 0);
begin
  return coalesce(
    (
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'logged_at', l.logged_at,
        'message', l.message,
        'level', l.level
      ) order by l.id)
      from internal.geoip_update_log as l
      where l.run_id = v_run_id
        and l.id > v_after_id
        and l.status is null
    ),
    '[]'::jsonb
  );
end;
$$ language plpgsql stable security definer
set search_path = internal;


-- Latest run status (with 30-min timeout logic)
create or replace function api.get_geoip_run_status()
returns jsonb as $$
declare
  v_result jsonb;
begin
  -- Find the most recent run_id, then get its latest lifecycle entry
  with latest_run as (
    select run_id
    from internal.geoip_update_log
    where status is not null
    order by run_id desc
    limit 1
  ),
  latest_status as (
    select distinct on (l.run_id)
      l.run_id,
      l.status,
      l.task_arn,
      l.error_message,
      l.logged_at as completed_at,
      l.network_rows,
      l.location_rows,
      l.duration_ms,
      l.last_modified
    from internal.geoip_update_log as l
    inner join latest_run as lr on lr.run_id = l.run_id
    where l.status is not null
    order by l.run_id desc, l.id desc
  ),
  first_entry as (
    select distinct on (l.run_id)
      l.run_id,
      l.triggered_by,
      l.logged_at as started_at
    from internal.geoip_update_log as l
    inner join latest_run as lr on lr.run_id = l.run_id
    order by l.run_id, l.id
  )
  select jsonb_build_object(
    'run_id', ls.run_id,
    'status', case
      when ls.status in ('pending', 'running')
        and fe.started_at < now() - interval '30 minutes'
      then 'failed'
      else ls.status
    end,
    'triggered_by', fe.triggered_by,
    'task_arn', ls.task_arn,
    'started_at', fe.started_at,
    'completed_at', case
      when ls.status in ('completed', 'failed', 'success') then ls.completed_at
      else null
    end,
    'error_message', case
      when ls.status in ('pending', 'running')
        and fe.started_at < now() - interval '30 minutes'
      then 'Task timed out after 30 minutes'
      else ls.error_message
    end,
    'network_rows', ls.network_rows,
    'location_rows', ls.location_rows,
    'duration_ms', ls.duration_ms,
    'last_modified', ls.last_modified
  )
  into v_result
  from latest_status as ls
  inner join first_entry as fe on fe.run_id = ls.run_id;

  return v_result;
end;
$$ language plpgsql stable security definer
set search_path = internal;


-- Paginated run history (latest lifecycle entry per run + started_at)
create or replace function api.get_geoip_run_history(p_filters jsonb default '{}')
returns jsonb as $$
declare
  v_limit  int := coalesce((p_filters ->> 'limit')::int, 10);
  v_offset int := coalesce((p_filters ->> 'offset')::int, 0);
  v_runs   jsonb;
  v_total  int;
begin
  -- Count distinct runs
  select count(distinct run_id) into v_total
    from internal.geoip_update_log
    where status is not null;

  -- Get paginated run summaries
  with run_ids as (
    select distinct run_id
    from internal.geoip_update_log
    where status is not null
    order by run_id desc
    limit v_limit
    offset v_offset
  ),
  latest_status as (
    select distinct on (l.run_id)
      l.run_id,
      l.logged_at as updated_at,
      l.status,
      l.task_arn,
      l.error_message,
      l.message as last_message,
      l.network_rows,
      l.location_rows,
      l.duration_ms,
      l.last_modified
    from internal.geoip_update_log as l
    inner join run_ids as ri on ri.run_id = l.run_id
    where l.status is not null
    order by l.run_id desc, l.id desc
  ),
  first_entry as (
    select distinct on (l.run_id)
      l.run_id,
      l.triggered_by,
      l.logged_at as started_at
    from internal.geoip_update_log as l
    inner join run_ids as ri on ri.run_id = l.run_id
    order by l.run_id, l.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'run_id', ls.run_id,
    'updated_at', ls.updated_at,
    'status', ls.status,
    'triggered_by', fe.triggered_by,
    'started_at', fe.started_at,
    'task_arn', ls.task_arn,
    'error_message', ls.error_message,
    'last_message', ls.last_message,
    'network_rows', ls.network_rows,
    'location_rows', ls.location_rows,
    'duration_ms', ls.duration_ms,
    'last_modified', ls.last_modified
  ) order by ls.run_id desc), '[]'::jsonb)
  into v_runs
  from latest_status as ls
  inner join first_entry as fe on fe.run_id = ls.run_id;

  return jsonb_build_object(
    'runs', v_runs,
    'total', v_total
  );
end;
$$ language plpgsql stable security definer
set search_path = internal;


-- Get current schedule
create or replace function api.get_geoip_schedule()
returns jsonb as $$
begin
  return (
    select jsonb_build_object(
      'cron_expression', s.cron_expression,
      'description', s.description,
      'updated_at', s.updated_at,
      'updated_by', s.updated_by
    )
    from internal.geoip_schedule as s
    order by s.id desc
    limit 1
  );
end;
$$ language plpgsql stable security definer
set search_path = internal;


-- Update schedule
create or replace function api.update_geoip_schedule(p_data jsonb)
returns jsonb as $$
declare
  v_result jsonb;
begin
  update internal.geoip_schedule
  set
    cron_expression = coalesce(p_data ->> 'cron_expression', cron_expression),
    description     = coalesce(p_data ->> 'description', description),
    updated_at      = now(),
    updated_by      = coalesce(p_data ->> 'updated_by', 'admin')
  where id = (select id from internal.geoip_schedule order by id limit 1)
  returning jsonb_build_object(
    'cron_expression', cron_expression,
    'description', description,
    'updated_at', updated_at,
    'updated_by', updated_by
  ) into v_result;

  return v_result;
end;
$$ language plpgsql security definer
set search_path = internal;
