create or replace function get_pairing_user_by_id(u_id uuid)
returns table (
  id int8,
  status text,
  WhiteElo text,
  BlackElo text,
  TimeControl text,
  white_id uuid,
  black_id
);
language sql
security definer
as $$
  select *
  from games where id in(select g.id from games g where g.white_id = u_id or g.black_id = u_id and g.status = "pairing");
$$;