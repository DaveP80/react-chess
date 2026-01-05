export async function inserNewMoves(supabase: any, fen: string, move: string, id: number) {
    const move_timestamp = new Date().toISOString();
    const new_move = `${fen}$${move}$${move_timestamp}`;
    const sql_query = `UPDATE game_number_${id} SET pgn = array_append(pgn, '${new_move}') WHERE id = ${id}`;
    try {
        const { data, error } = await supabase.rpc(`execute_sql`, {sql_query});
        return true;
    } catch (error) {

        return false;
        
    }
}

// export async function onDropApiHandler(supabase: any, row_id: number, new_move_response: any) {
//     const channel = supabase
//     .channel("realtime-messages")
//     .on(
//       "postgres_changes",
//       { event: "*", schema: "public", table: `game_number_${row_id}` },
//       async (payload: { eventType: string; }) => {
//           if (payload.eventType === "UPDATE") {
//               try {
//                   new_move_response = await supabase.from(`game_number_${row_id}`).select("pgn").eq("id", row_id);
//                   return new_move_response;
                  
//                 } catch (error) {
//                     console.error(error);
//                     return {go: false, message: "error retrieving broadcasted new move"}
//                 }

          
//             }
//         }
//     )
//         .subscribe();
//     }

export async function createNewGameTable(supabase: any, id: number) {
        const sql_query = `
create table public.game_number_${id} as
select *
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
            const { data, error } = await supabase.rpc(`execute_sql`, {sql_query});
            if (error) {
                return error;
            }
            else {
                return data;
            }
        } catch (error) {
    
            return error;
            
        }
    }