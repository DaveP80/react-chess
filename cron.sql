-- cron cron cron cron cron cron cron cron cron cron cron cron cron cron
create or replace function public.purge_abondoned_timed_games () returns void language plpgsql security definer
set
  search_path = public,
  pg_temp as $$
begin
delete from game_moves where game_id in
(select game_id from (
WITH cte AS (
  SELECT 
    g.id AS games_table_id, 
    gm.id AS game_moves_id, 
    game_id,
    (pgn_info ->> 'date')::timestamptz AS game_start_time, 
    pgn_info ->> 'result' AS game_result, 
    split_part(pgn[array_length(pgn, 1)], '$', 3)::timestamptz AS last_move_timestamp,
    (split_part(timecontrol, '+', 1)::INTEGER * 60 * 2 + (300*5) + 280) AS time_control_seconds
  FROM games g 
  JOIN game_moves gm ON g.id = gm.game_id where timecontrol != 'unlimited'
)
SELECT 
  *,
  EXTRACT(EPOCH FROM (NOW() - game_start_time)) > time_control_seconds AS is_expired
FROM cte
) z where z.game_result = '' and is_expired);
end;
$$;

CREATE OR REPLACE PROCEDURE public.purge_old_game_rows()
 LANGUAGE plpgsql
AS $procedure$
begin
  delete from public.games where id not in (select game_id from public.game_moves)
  and created_at < now() - INTERVAL '45 seconds';
  delete from public.games_pairing where id not in (select game_id from public.game_moves)
  and created_at < now() - INTERVAL '90 seconds';
end;
$procedure$

SELECT cron.schedule(
  job_name   => 'purge_old_game_rows_every_minute',
  schedule   => '* * * * *',
  command    => $$CALL public.purge_old_game_rows();$$
);

ALTER TABLE public.games
  ALTER COLUMN id SET DEFAULT nextval('public.global_game_id_seq');

ALTER TABLE public.games_pairing
  ALTER COLUMN id SET DEFAULT nextval('public.global_game_id_seq');

-- finind all functions in schema
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_functiondef(p.oid) as definition
from
  pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
where
  n.nspname = 'public'
order by
  function_name,
  args;

-- drop game_number_x tables that are 5 hours old from create time.
CREATE OR REPLACE PROCEDURE public.drop_finished_game_number_tables()
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec record;
  should_drop boolean;
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE 'game_number_%'
  LOOP
    IF substring(rec.table_name FROM '^game_number_([0-9]+)$') IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'SELECT EXISTS (
         SELECT 1
         FROM %I.%I
         WHERE btrim(pgn_info->>''time_control'') != ''unlimited''
           AND created_at < now() - INTERVAL ''5 hours''
         LIMIT 1
       )',
       rec.schema_name, rec.table_name
    ) INTO should_drop;

    IF should_drop THEN
      RAISE NOTICE 'Dropping table %.%', rec.schema_name, rec.table_name;
      EXECUTE format('DROP TABLE IF EXISTS %I.%I', rec.schema_name, rec.table_name);
    END IF;
  END LOOP;
END;
$$;