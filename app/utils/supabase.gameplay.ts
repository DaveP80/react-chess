import { timeControlReducer } from "./helper";

export async function insertNewMoves(
  supabase: any,
  activeGame: any,
  move: string[],
  id: number,
  draw: string,
  result: string | null,
  termination: string | null,
  gameData: Record<string, any>,
  whiteTime?: number,
  blackTime?: number
) {
  const move_timestamp = new Date().toISOString();
  // Include time remaining if provided (format: fen$move$timestamp$whiteTime$blackTime)
  const timeData =
    whiteTime !== undefined && blackTime !== undefined
      ? `$${whiteTime}$${blackTime}`
      : null;

  //const new_move = `${activeGame.fen()}$${move}$${move_timestamp}${timeData}`;
  const new_move = `${move[0]}$${move[1]}$${move_timestamp}${timeData}`;
  const drawConcat = draw ? ", draw_offer = NULL" : "";
  let pgn_infoConcat = "";
  if (result && termination && !gameData.pgn_info.result) {
    // Convert to JSON string and escape single quotes for PostgreSQL
    const jsonString = JSON.stringify({
      ...gameData.pgn_info,
      result,
      termination,
    });
    const escapedJson = jsonString.replace(/'/g, "''");
    pgn_infoConcat = `, pgn_info = '${escapedJson}'::jsonb`;
  }
  const sql_query = `UPDATE game_number_${id} SET pgn = array_append(pgn, '${new_move}')${drawConcat}${pgn_infoConcat} WHERE id = ${id}`;
  try {
    const { data, error } = await supabase.rpc(`execute_sql`, { sql_query });
  } catch (error) {
    return console.error(error);
  }
}

export async function updateTablesOnGameOver(
  supabase: any,
  game_id: number,
  pgn_info: Record<string, any>,
  pgn: string[],
  white_id: string,
  black_id: string,
  whiteelo: number,
  blackelo: number,
  timeControl: string,
  game_number_id: number
) {
  // Convert to JSON string and escape single quotes for PostgreSQL
  const jsonString = JSON.stringify(pgn_info);
  const escapedJson = jsonString.replace(/'/g, "''");
  const [, ratingType] = timeControlReducer(timeControl);
  
  // Convert pgn array to PostgreSQL array format and escape single quotes
  const escapedPgnArray = pgn.map(item => `'${item.replace(/'/g, "''")}'`).join(', ');
  
  // Build SQL queries
  const sql_query_game_moves = `UPDATE game_moves SET pgn = ARRAY[${escapedPgnArray}], pgn_info = '${escapedJson}'::jsonb WHERE id = ${game_number_id};`;
  const sql_query_games_table = `UPDATE games SET status = 'end' WHERE id = ${game_id};`;
  const sql_query_user_white = `UPDATE users SET "isActive" = false, rating = jsonb_set(rating, '{${ratingType}}', to_jsonb(${whiteelo})) WHERE u_id = '${white_id}'::uuid;`;
  const sql_query_user_black = `UPDATE users SET "isActive" = false, rating = jsonb_set(rating, '{${ratingType}}', to_jsonb(${blackelo})) WHERE u_id = '${black_id}'::uuid;`;
  
  // Concatenate all queries
  const final_sql_query_string = sql_query_game_moves + sql_query_games_table + sql_query_user_white + sql_query_user_black;
  
  try {
    const { data, error } = await supabase.rpc(`execute_sql`, { sql_query: final_sql_query_string });
    
    if (error) {
      console.error("SQL Error:", error);
      console.error("Failed Query:", final_sql_query_string);
    }
  } catch (error) {
    console.error(error);
  }
}


export async function createNewGameTable(supabase: any, id: number) {
  const sql_query = `
create table public.game_number_${id} as
select *, NULL as draw_offer
from public.game_moves
where id = ${id};
ALTER TABLE public.game_number_${id} ADD PRIMARY KEY (id);
ALTER TABLE public.game_number_${id} REPLICA IDENTITY FULL;
ALTER TABLE public.game_number_${id} ENABLE ROW LEVEL SECURITY;
create policy "game_number_${id}_policy"


on "public"."game_number_${id}"


as PERMISSIVE


for ALL


to public


using (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_number_${id};
`;
  try {
    const { data, error } = await supabase.rpc(`execute_sql`, { sql_query });
    if (error) {
      return error;
    } else {
      return data;
    }
  } catch (error) {
    return error;
  }
}

export async function lookup_userdata_on_active_status(
  supabase: any,
  id: number,
  user_id: string
) {
  const sql_query = `with cte as (
  select id from games where pgn_info ->> 'white' = ${user_id} or pgn_info ->> 'black' = ${user_id}
)
select z.* from cte join (
select gm.id, gm.pgn_info, gm.pgn, u.username as white_username, u_t.username as black_username, u."avatarURL" as white_avatar, u_t."avatarURL" as black_avatar, 
u.rating as white_rating, u_t.rating as black_rating from game_number_${id} gm left join users u on gm.pgn_info ->> 'white' = u.u_id::text left join users u_t on gm.pgn_info ->> 'black' = 
u_t.u_id::text where u."isActive" = true and u_t."isActive" = true ) z on cte.id = z.id;`;
  try {
    const { data, error } = await supabase.rpc(`execute_sql`, { sql_query });
    return true;
  } catch (error) {
    return false;
  }
}

export async function cancelDrawOffer(
  supabase: any,
  gameData: Record<string, number>,
  setDraw: (x: string) => void
) {
  try {
    await supabase
      .from(`game_number_${gameData.id}`)
      .update({ draw_offer: null })
      .eq("id", gameData.id);
    setDraw("");
    //close draw flow
  } catch (error) {
    console.error(error);
  }
}
