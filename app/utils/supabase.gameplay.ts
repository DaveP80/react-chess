export async function inserNewMoves(supabase: any, move: string, id: number) {
    const move_timestamp = new Date().toISOString();
    try {
        const { data, error } = await supabase.rpc(`update_live_game_moves_pgn`, {move_san: move, move_timestamp, game_id: id});
        return true;
    } catch (error) {

        return false;
        
    }
}