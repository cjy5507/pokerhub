-- Supabase pg_cron setup for always-on game ticking (no active users required)
-- Run in Supabase SQL Editor (Project SQL).
--
-- Prerequisites:
-- 1) Set APP URL and TOKEN below.
-- 2) In Vercel env, set CRON_SYNC_TOKEN to the same token value.
-- 3) Deploy app first so /api/cron/game-tick is reachable.

-- Required extensions (enabled once per DB)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Optional: remove old job if it exists
do $$
declare
  j record;
begin
  for j in
    select jobid
    from cron.job
    where jobname = 'game_tick_every_minute'
  loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

-- Replace these values before running:
--   https://pokerhub-eight.vercel.app
--   YOUR_LONG_RANDOM_TOKEN
select cron.schedule(
  'game_tick_every_minute',
  '* * * * *',
  $$
  select
    net.http_get(
      url := 'https://pokerhub-eight.vercel.app/api/cron/game-tick?token=YOUR_LONG_RANDOM_TOKEN',
      timeout_milliseconds := 10000
    );
  $$
);

-- Verify job
select jobid, jobname, schedule, active
from cron.job
where jobname = 'game_tick_every_minute';

-- Check recent runs (optional)
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid in (
  select jobid from cron.job where jobname = 'game_tick_every_minute'
)
order by start_time desc
limit 20;
