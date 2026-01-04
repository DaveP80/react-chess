export async function inserNewMoves(supabase: any, move: string, id: number) {
    const insert_time = new Date().toISOString();
    try {
        const { data, error } = await supabase
        .from('game_moves')
        .update({ 
          moves: supabase.raw(`array_cat(moves, ARRAY['${move}', '${insert_time}'])`) 
        })
        .eq('id', id);
        return true;
    } catch (error) {

        return false;
        
    }
}