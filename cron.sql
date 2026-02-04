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
