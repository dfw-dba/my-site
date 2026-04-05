-- 010_geoip_log_run_tracking.sql
-- Link geoip_update_log entries to their task run and capture last progress message.

alter table internal.geoip_update_log
  add column run_id       int4 references internal.geoip_task_runs(id),
  add column last_message text;

comment on column internal.geoip_update_log.run_id is
    'FK to geoip_task_runs; null for scheduled (non-manual) runs';
comment on column internal.geoip_update_log.last_message is
    'Last progress message at the time the log entry was written';


-- Recreate to include new columns in output
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
        status,
        run_id,
        last_message
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
