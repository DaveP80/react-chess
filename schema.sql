-- get black pairing partner if user requesting is with white pieces.
create or replace function get_black_pairing_by_id_join(u_id uuid, timeControl_f text, is_rated_f boolean)
returns table (
  id int8,
  id_gt int8,
  white_id uuid,
  black_id uuid,
  status text,
  created_at text,
  created_at_gt text,
  timecontrol text,
  whiteelo int8,
  blackelo int8,
  is_rated boolean
)
language sql
security definer
as $$
  select g.id, g_t.id id_gt, g.white_id, g_t.black_id, g.status, g.created_at, g_t.created_at created_at_gt, g.timecontrol, g.whiteelo, g_t.blackelo, g.is_rated
  from (select * from games where games.white_id = u_id) g join (select * from games where games.black_id != u_id) g_t on g.status = 'pairing' and g_t.status = 'pairing' and g.timecontrol = g_t.timecontrol and g.is_rated = g_t.is_rated where g.timecontrol = timeControl_f and g.is_rated = is_rated_f 
  and ABS(EXTRACT(EPOCH FROM (g.created_at - g_t.created_at))) <= 30 order by g_t.created_at desc;
$$;

-- get white pairing partner if user requesting is with black pieces.
create or replace function get_white_pairing_by_id_join(u_id uuid, timeControl_f text, is_rated_f boolean)
returns table (
  id int8,
  id_gt int8,
  white_id uuid,
  black_id uuid,
  status text,
  created_at text,
  created_at_gt text,
  timecontrol text,
  whiteelo int8,
  blackelo int8,
  is_rated boolean
)
language sql
security definer
as $$
  select g.id, g_t.id id_gt, g.white_id, g_t.black_id, g.status, g.created_at, g_t.created_at created_at_gt, g.timecontrol, g.whiteelo, g_t.blackelo, g.is_rated
  from (select * from games where games.white_id != u_id) g join (select * from games where games.black_id = u_id) g_t on g.status = 'pairing' and g_t.status = 'pairing' and g.timecontrol = g_t.timecontrol and g.is_rated = g_t.is_rated where g.timecontrol = timeControl_f and g.is_rated = is_rated_f 
  and ABS(EXTRACT(EPOCH FROM (g.created_at - g_t.created_at))) <= 30 order by g_t.created_at desc;
$$;


-- get random pairing.
create or replace function get_random_pairing_by_id_join(u_id uuid, timecontrol_f text, is_rated_f boolean)
returns table (
  id int8,
  id_gt int8,
  white_id uuid,
  black_id uuid,
  status text,
  created_at text,
  created_at_gt text,
  timecontrol text,
  whiteelo int8,
  blackelo int8,
  is_rated boolean
)
language sql
security definer
as $$
  select g.id, g_t.id id_gt, g.white_id, g_t.black_id, g.status, g.created_at, g_t.created_at created_at_gt, g.timecontrol, g.whiteelo, g_t.blackelo, g.is_rated
  from (select * from games where games.white_id != u_id and games.black_id != u_id) g join (select * from games where games.black_id = u_id and games.white_id = u_id) g_t on g.status = 'pairing' and g_t.status = 'pairing' and g.timecontrol = g_t.timecontrol and g.is_rated = g_t.is_rated 
  join users ut on ut.u_id = g.white_id where g.timecontrol = timecontrol_f and g.is_rated = is_rated_f and ut."isActive" = false and ABS(EXTRACT(EPOCH FROM (g.created_at - g_t.created_at))) <= 30 order by g_t.created_at desc;
$$;

create or replace function get_member_pairing_by_id(u_id_in text)
returns table (
  id int8,
  created_at text,
  status text,
  whiteelo int,
  blackelo int,
  timecontrol text,
  white_id uuid,
  black_id uuid,
  username_a text,
  username_b text,
  is_rated boolean
)
language sql
security definer
as $$
SELECT id, gp.created_at, status, whiteelo, blackelo, timecontrol, white_id, black_id, u.username as username_a, ut.username as username_b, is_rated
FROM public.games_pairing gp left join users u on gp.white_id = u.u_id left join users ut on gp.black_id = ut.u_id
WHERE (white_id = u_id_in::uuid OR black_id = u_id_in::uuid)
  AND gp.created_at >= NOW() - INTERVAL '60 seconds'
ORDER BY gp.created_at DESC;
$$;

create or replace function get_similar_game_requests_lobby(is_rated_f boolean)
returns table (
  id int8,
  status text,
  created_at text,
  timecontrol text,
  whiteelo int8,
  blackelo int8,
  username text,
  is_rated boolean
)
language sql
security definer
as $$
  select id, g.status, created_at, timecontrol, whiteelo, blackelo, username, is_rated
  from games g join users u on u.u_id = g.white_id or u.u_id = g.black_id where is_rated = is_rated_f and g.status = 'pairing' order by created_at desc;
$$;

-- version 2.0 12-25-25
create or replace function insert_new_pairing_request(color_flag text, timecontrol_f text, game_length text, is_rated_f boolean, u_id_in uuid)
returns table (
  id int8,
  created_at text,
  turn text,
  status text,
  whiteelo int8,
  blackelo int8,
  timecontrol text,
  white_id uuid,
  black_id uuid,
  is_rated boolean
)
language sql
security definer
as $$
INSERT INTO games (turn, status, whiteelo, blackelo, timecontrol, white_id, black_id, is_rated) values ('white', 'pairing',
case when color_flag = 'white' then (SELECT (u.rating ->> timecontrol_f)::int FROM users u WHERE u.u_id = u_id_in limit 1) else null end, case when color_flag = 'black' then (SELECT (u.rating ->> timecontrol_f)::int FROM users u WHERE u.u_id = u_id_in limit 1) else null end, game_length, 
case when color_flag = 'white' then u_id_in else null end, case when color_flag = 'black' then u_id_in else null end, is_rated_f) returning *;
$$;

create or replace function insert_new_random_pairing_request(timecontrol_f text, game_length text, u_id_in uuid, is_rated_f boolean)
returns table (
  id int8,
  created_at text,
  turn text,
  status text,
  whiteelo int8,
  blackelo int8,
  timecontrol text,
  white_id uuid,
  black_id uuid,
  is_rated boolean
)
language sql
security definer
as $$
INSERT INTO games (turn, status, whiteelo, blackelo, timecontrol, white_id, black_id, is_rated) values ('white', 'pairing',
(SELECT (u.rating ->> timecontrol_f)::int FROM users u WHERE u.u_id = u_id_in limit 1), (SELECT (ut.rating ->> timecontrol_f)::int FROM users ut WHERE ut.u_id = u_id_in limit 1), game_length, 
u_id_in, u_id_in, is_rated_f) returning *;
$$;

create or replace function insert_new_member_pairing_request(color_flag text, game_length text, whiteelo_f int, blackelo_f int, u_id_in text, username_f text, is_rated_f boolean)
returns table (
  id int8,
  created_at text,
  status text,
  white_id uuid,
  black_id uuid,
  whiteelo int8,
  blackelo int8,
  timecontrol text,
  is_rated boolean,
  turn text
)
language sql
security definer
as $$
INSERT INTO games_pairing (status, whiteelo, blackelo, timecontrol, white_id, black_id, is_rated) values ('pairing', 
whiteelo_f, blackelo_f, game_length, case when color_flag = 'white' then (select u_id from users where username = username_f limit 1) else u_id_in::uuid end, case when color_flag = 'black' then (select u_id from users where username = username_f limit 1) else u_id_in::uuid end, 
is_rated_f) returning *;
$$;

-- version 2.0 12-27-25
create or replace function lookup_new_game_moves(find_id int)
returns table (
  found_id boolean,
  id int,
  game_id int,
  game_id_b int,
  pgn_info jsonb
)
language sql
security definer
as $$
select case when find_id in (game_id, game_id_b) then true else false end as found_id, id, game_id, game_id_b, pgn_info from game_moves order by found_id desc limit 1;
$$;

create or replace function update_live_pairing_request (
  black_elo_update int,
  white_elo_update int,
  black_id_update uuid,
  white_id_update uuid,
  white_g_update_id int,
  black_g_update_id int
) returns void language sql security definer as $$
UPDATE games SET status = 'playing', blackelo = black_elo_update, whiteelo = white_elo_update, black_id = black_id_update, white_id = white_id_update WHERE id in (white_g_update_id, black_g_update_id);
$$

create or replace function lookup_userdata_on_gameid(game_id_f int)
returns table (
  id int,
  pgn_info jsonb,
  pgn text[],
  white_username text,
  black_username text,
  white_avatar text,
  black_avatar text,
  white_rating jsonb,
  black_rating jsonb
)
language sql
security definer
as $$
select gm.id, gm.pgn_info, gm.pgn, u.username as white_username, u_t.username as black_username, u."avatarURL" as white_avatar, u_t."avatarURL" as black_avatar, u.rating as white_rating, u_t.rating as black_rating from game_moves gm left join users u on gm.pgn_info ->> 'white' = u.u_id::text left join users u_t on gm.pgn_info ->> 'black' = u_t.u_id::text where id = game_id_f;
$$;

create or replace function lookup_userdata_on_active_status(user_id text)
returns table (
  id int,
  pgn_info jsonb,
  pgn text[],
  white_username text,
  black_username text,
  white_avatar text,
  black_avatar text,
  white_rating jsonb,
  black_rating jsonb
)
language sql
security definer
as $$
with cte as (
  select id from game_moves where pgn_info ->> 'white' = user_id::text or pgn_info ->> 'black' = user_id::text
)
select z.* from cte join (
select gm.id, gm.pgn_info, gm.pgn, u.username as white_username, u_t.username as black_username, u."avatarURL" as white_avatar, u_t."avatarURL" as black_avatar, u.rating as white_rating, u_t.rating as black_rating from game_moves gm left join users u on gm.pgn_info ->> 'white' = u.u_id::text left join users u_t on gm.pgn_info ->> 'black' = u_t.u_id::text where u."isActive" = true and u_t."isActive" = true
) z on cte.id = z.id order by z.id;
$$;

create or replace function update_live_game_moves_pgn (
  new_move text, game_id int
) returns void language sql security definer as $$
UPDATE game_moves
SET pgn = pgn || new_move
WHERE id = game_id;
$$

-- Create a generic raw SQL executor (one-time setup)
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.execute_sql_lookup_userdata_on_gameid(sql_query text)
RETURNS TABLE (
  id int,
  game_id int,
  game_id_b int,
  pgn_info jsonb,
  pgn text[],
  draw_offer text,
  timecontrol text,
  white_username text,
  black_username text,
  white_avatar text,
  black_avatar text,
  white_rating jsonb,
  black_rating jsonb,
  white_count bigint,
  black_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE sql_query;
END;
$$;

SELECT n.nspname AS schema,
       p.proname  AS function,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS return_type,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'purge_old_game_rows';

create or replace function lookup_games_played_by_userid(user_id text)
returns table (
  id int,
  created_at text,
  status text,
  whiteelo int,
  blackelo int,
  timecontrol text,
  white_id uuid,
  black_id uuid,
  white_username text,
  black_username text,
  game_id int,
  pgn_info jsonb,
  pgn text[]
)
language sql
security definer
as $$
select gm.id, gm.created_at, status, whiteelo, blackelo, timecontrol, white_id, black_id, u.username as white_username, ut.username as black_username, game_id, pgn_info, pgn from (
  select id, created_at, status, timecontrol, whiteelo, blackelo, white_id, black_id, is_rated from games
union all
select id, created_at, status, timecontrol, whiteelo, blackelo, white_id, black_id, is_rated from games_pairing
) g join game_moves gm on g.id = gm.game_id join users u on u.u_id = g.white_id join users ut on ut.u_id = g.black_id where white_id = user_id::uuid or black_id = user_id::uuid;
$$;

create or replace function lookup_games_played_by_username (f_username text) returns table (
  id int,
  created_at text,
  status text,
  whiteelo int,
  blackelo int,
  timecontrol text,
  white_username text,
  black_username text,
  white_avatarurl text,
  black_avatarurl text,
  white_isactive boolean,
  black_isactive boolean,
  white_rating_info jsonb,
  black_rating_info jsonb,
  game_id int,
  pgn_info jsonb,
  pgn text[]
) language sql security definer as $$
select gm.id, gm.created_at, status, whiteelo, blackelo, timecontrol, white_username, black_username, white_avatarurl, black_avatarurl, white_isactive, black_isactive,
white_rating_info, black_rating_info, game_id, pgn_info, pgn from (select *, un.username as white_username, unt.username as black_username, un."avatarURL" as white_avatarurl, unt."avatarURL" as black_avatarurl,
un."isActive" as white_isactive, unt."isActive" as black_isactive, un.rating as white_rating_info, unt.rating as black_rating_info from (
  select id, created_at, status, timecontrol, whiteelo, blackelo, white_id, black_id, is_rated from games
union all
select id, created_at, status, timecontrol, whiteelo, blackelo, white_id, black_id, is_rated from games_pairing
) gz join users un on gz.white_id = un.u_id
join users unt on gz.black_id = unt.u_id) g join game_moves gm on g.id = gm.game_id where lower(white_username) = lower(f_username)
 or lower(black_username) = lower(f_username);
$$;

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY function_name, args;

ALTER TABLE games
ADD CONSTRAINT check_at_least_one_player
CHECK (white_id IS NOT NULL OR black_id IS NOT NULL);