-- Migration 006: Add analytics timeseries function
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
