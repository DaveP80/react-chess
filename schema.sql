create or replace function get_pairing_user_by_id(u_id uuid)
returns table (
  id int8,
  status text,
  WhiteElo text,
  BlackElo text,
  TimeControl text,
  white_id uuid,
  black_id uuid
)
language sql
security definer
as $$
  select *
  from games where id in(select g.id from games g where g.white_id = u_id or g.black_id = u_id and g.status = "pairing");
$$;

-- -----------------
create or replace function get_white_pairing_by_id(u_id uuid, color text)
returns table (
  id int8,
  status text,
  WhiteElo text,
  BlackElo text,
  TimeControl text,
  white_id uuid,
  black_id
)
language sql
security definer
as $$
  select *
  from games where black_id != u_id and status = 'pairing';
$$;
-- get black pairing partner if user requesting is with white pieces.
create or replace function get_black_pairing_by_id_join(u_id uuid, timeControl text)
returns table (
  id int8,
  id_gt int8,
  white_id uuid,
  black_id uuid,
  status text,
  created_at text,
  created_at_gt text,
  TimeControl text,
  WhiteElo int8,
  BlackElo int8
)
language sql
security definer
as $$
  select g.id, g_t.id id_gt, g.white_id, g_t.black_id, g.status, g.created_at, g_t.created_at created_at_gt, g."TimeControl", g."WhiteElo", g_t."BlackElo"
  from (select * from games where games.white_id = u_id) g join (select * from games where games.black_id != u_id) g_t on g.status = 'pairing' and g_t.status = 'pairing' and g."TimeControl" = g_t."TimeControl" where g."TimeControl" = timeControl and ABS(EXTRACT(EPOCH FROM (g.created_at - g_t.created_at))) <= 20;
$$;

-- get white pairing partner if user requesting is with black pieces.
create or replace function get_white_pairing_by_id_join(u_id uuid, timeControl text)
returns table (
  id int8,
  id_gt int8,
  white_id uuid,
  black_id uuid,
  status text,
  created_at text,
  created_at_gt text,
  TimeControl text,
  WhiteElo int8,
  BlackElo int8
)
language sql
security definer
as $$
  select g.id, g_t.id id_gt, g.white_id, g_t.black_id, g.status, g.created_at, g_t.created_at created_at_gt, g."TimeControl", g."WhiteElo", g_t."BlackElo"
  from (select * from games where games.white_id != u_id) g join (select * from games where games.black_id = u_id) g_t on g.status = 'pairing' and g_t.status = 'pairing' and g."TimeControl" = g_t."TimeControl" where g."TimeControl" = timeControl and ABS(EXTRACT(EPOCH FROM (g.created_at - g_t.created_at))) <= 20;
$$;

-- version 2.0 12-25-25
create or replace function insert_new_pairing_request(color_flag text, timeControl text, game_length text, u_id uuid)
returns table (
  id int8,
  created_at text,
  turn text,
  status text,
  WhiteElo int8,
  BlackElo int8,
  TimeControl text,
  white_id uuid,
  black_id uuid
)
language sql
security definer
as $$
INSERT INTO games (turn, status, "WhiteElo", "BlackElo", "TimeControl", white_id, black_id) values ('white', 'pairing',
case when color_flag = 'white' then (SELECT (u.rating ->> timeControl)::int FROM users u WHERE u.u_id = u_id limit 1) else null end, case when color_flag = 'black' then (SELECT (u.rating ->> timeControl)::int FROM users u WHERE u.u_id = u_id limit 1) else null end, game_length, 
case when color_flag = 'white' then u_id else null end, case when color_flag = 'black' then u_id else null end) returning *;
$$;

