-- get black pairing partner if user requesting is with white pieces.
create or replace function get_black_pairing_by_id_join(u_id uuid, timeControl_f text)
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
  blackelo int8
)
language sql
security definer
as $$
  select g.id, g_t.id id_gt, g.white_id, g_t.black_id, g.status, g.created_at, g_t.created_at created_at_gt, g.timecontrol, g.whiteelo, g_t.blackelo
  from (select * from games where games.white_id = u_id) g join (select * from games where games.black_id != u_id) g_t on g.status = 'pairing' and g_t.status = 'pairing' and g.timecontrol = g_t.timecontrol where g.timecontrol = timeControl_f and ABS(EXTRACT(EPOCH FROM (g.created_at - g_t.created_at))) <= 20 order by g_t.created_at desc;
$$;

-- get white pairing partner if user requesting is with black pieces.
create or replace function get_white_pairing_by_id_join(u_id uuid, timeControl_f text)
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
  blackelo int8
)
language sql
security definer
as $$
  select g.id, g_t.id id_gt, g.white_id, g_t.black_id, g.status, g.created_at, g_t.created_at created_at_gt, g.timecontrol, g.whiteelo, g_t.blackelo
  from (select * from games where games.white_id != u_id) g join (select * from games where games.black_id = u_id) g_t on g.status = 'pairing' and g_t.status = 'pairing' and g.timecontrol = g_t.timecontrol where g.timecontrol = timeControl_f and ABS(EXTRACT(EPOCH FROM (g.created_at - g_t.created_at))) <= 20 order by g_t.created_at desc;
$$;

-- version 2.0 12-25-25
create or replace function insert_new_pairing_request(color_flag text, timeControl_f text, game_length text, u_id uuid)
returns table (
  id int8,
  created_at text,
  turn text,
  status text,
  whiteelo int8,
  blackelo int8,
  timecontrol text,
  white_id uuid,
  black_id uuid
)
language sql
security definer
as $$
INSERT INTO games (turn, status, whiteelo, blackelo, timecontrol, white_id, black_id) values ('white', 'pairing',
case when color_flag = 'white' then (SELECT (u.rating ->> timeControl_f)::int FROM users u WHERE u.u_id = u_id limit 1) else null end, case when color_flag = 'black' then (SELECT (u.rating ->> timeControl_f)::int FROM users u WHERE u.u_id = u_id limit 1) else null end, game_length, 
case when color_flag = 'white' then u_id else null end, case when color_flag = 'black' then u_id else null end) returning *;
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

create or replace function lookup_userdata_on_active_status(user_id int)
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
  move_san text, move_timestamp text, game_id int
) returns void language sql security definer as $$
UPDATE game_moves
SET pgn = array_cat(pgn, ARRAY[move_san, move_timestamp])
WHERE id = game_id;
$$