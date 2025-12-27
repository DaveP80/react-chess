let foobar = {};
export function gameRequest(
  localSupabase: any,
  color: string,
  timeControl: string
) {
  return true;
}

export async function gamesNewRequestOnUserColor(
  localSupabase: any,
  userId: string,
  headers: {},
  user_color: string,
  timeControl: string
) {
  try {
    if (user_color == "white" || user_color == "black") {
      let game_length = null;
      switch (timeControl) {
        case "3": {
          timeControl = "blitz_rating";
          game_length = "3";
          break;
        }
        case "5": {
          timeControl = "blitz_rating";
          game_length = "5";
          break;
        }
        case "10": {
          timeControl = "rapid_rating";
          game_length = "10";
          break;
        }
        case "unlimited": {
          timeControl = "rapid_rating";
          game_length = "unlimited";
          break;
        }
      }
      const { data, error } = await localSupabase.rpc(
        "insert_new_pairing_request",
        {
          color_flag: user_color,
          timecontrol_f: timeControl,
          game_length,
          u_id: userId,
        }
      );
      if (error) {
        return Response.json(
          {
            error,
            go: false,
            message: `failed to insert new pairing request on ${user_color}_user_id`,
          },
          { headers }
        );
      }
      else {
        return Response.json({data, go: true, message: "new pairing insert on games table."}, {headers});
      }
  } 
}
  catch (error) {
    return Response.json({ error }, { headers });
  }
};

export async function handleInsertedNewGame(localSupabase: any, userId: any, user_color: string, game_length: any, headers: any) {
  try {
    const { data: data_a, error: error_a } = await localSupabase.rpc(
      `get_${user_color == "white" ? "black" : "white"}_pairing_by_id_join`,
      { u_id: userId, timecontrol_f: game_length }
    );
    if (error_a) {
      return Response.json(
        {
          error: error_a,
          go: false,
          message: `failed lookup black user searching`,
        },
      );
    };
    console.log(data_a);
    if (data_a && data_a?.length) {
      const updateObjWhite = { ...data_a[0] };
      const id = updateObjWhite.id;
      const id_gt = updateObjWhite.id_gt;
      Reflect.deleteProperty(updateObjWhite, "id");
      Reflect.deleteProperty(updateObjWhite, "id_gt");
      Reflect.deleteProperty(updateObjWhite, "created_at_gt");
      Reflect.deleteProperty(updateObjWhite, "created_at");
      Reflect.deleteProperty(updateObjWhite, "timecontrol");
      Reflect.deleteProperty(updateObjWhite, "status");
      updateObjWhite[`status`] = 'playing';
      //TODO: update status field to playing after game starts.
      const { data: data_a_update, error } = await localSupabase
        .from("games")
        .update(updateObjWhite)
        .eq("id", id);
      const { data: data_b_update, error: error_b } = await localSupabase
        .from("games")
        .update(updateObjWhite)
        .eq("id", id_gt);
      if (error || error_b) {
        return Response.json(
          {
            error: {error: error, error_b: error_b},
            go: false,
            message:
              "failed to update on games table with black and white id",
          },
        );
      } else {
        const response = await handleInsertStartGame(localSupabase, {data: data_a_update, data_b: data_b_update}, headers);
        return response
        // return Response.json(
        //   {
        //     error: null,
        //     go: true,
        //     message: `success in pairing, found ${user_color == "white" ? "black" : "white"}_user_id`,
        //     data: {data: data_a_update, data_b: data_b_update}
        //   },
        // );
      }
    } else {
      return Response.json(
        {
          message: `unsuccessful search on finding ${user_color == "white" ? "black" : "white"} user id in games`,
          go: false,
        },
      );
    }
    
  } catch (error) {
    return Response.json({message: "", go: false, error}, {headers});
    
  }

}

export async function getNewGamePairing(id: string, pairing_info: any, supabase: any, headers: {}) {
  try {

    const {data, error} = await supabase.from("games").select().eq("id", pairing_info.data.data.id);
    if (error) {
      return Response.json({go: false, error}, {headers})
    }

    if (data && data?.length) {
      "foo"

    }
    
  } catch (error) {
    return Response.json({"error": "error"})
    
  }

}

export async function handleInsertStartGame(supabase: any, data: any, headers: any) {
  //to determine game_id to use in foreign key.
  const created_at_id_ref = new Date(data.data.created_at) > new Date(data.data_b.created_at) ? data.data.id : data.data_b.id;
  const game_id_ref = [data.data.id, data.data_b.id];

  try {
    const {data, error} = await supabase.from("games").insert({game_id: created_at_id_ref, game_id_ref, })
    if (error) {
      return Response.json({go: false, error, message: "error on entering new row on games table"}, {headers});
    }

    else {
      return Response.json({go: true, message: "successfully entereed new row on games start table."}, {headers});
    }
    
  } catch (error) {

   return Response.json({go: false, error, message: "unknown supabase error on handleInsertStartGame"}, {headers});
    
  }

}