import { join } from "path";

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
      } else {
        return Response.json(
          { data, go: true, message: "new pairing insert on games table." },
          { headers }
        );
      }
    }
  } catch (error) {
    return Response.json({ error }, { headers });
  }
}

export async function handleInsertedNewGame(
  localSupabase: any,
  userId: any,
  user_color: string,
  game_length: any,
  created_at: string,
  headers: any
) {
  try {
    const { data: data_a, error: error_a } = await localSupabase.rpc(
      `get_${user_color == "white" ? "black" : "white"}_pairing_by_id_join`,
      { u_id: userId, timecontrol_f: game_length }
    );
    if (error_a) {
      return Response.json({
        error: error_a,
        go: false,
        message: `failed lookup black user searching`,
      });
    }
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
      updateObjWhite[`status`] = "playing";
      const greater_at =
      new Date(data_a[0].created_at) > new Date(data_a[0].created_at_gt)
        ? data_a[0].created_at
        : data_a[0].created_at_gt;
    const continue_request = greater_at == created_at;
    if (!continue_request) {

      const [aResult, bResult] = await Promise.all([
        localSupabase
          .from("games")
          .update(updateObjWhite)
          .eq("id", id)
          .select(),
        localSupabase
          .from("games")
          .update(updateObjWhite)
          .eq("id", id_gt)
          .select(),
      ]);
      const { data: data_a_update, error: error_a } = aResult;
      const { data: data_b_update, error: error_b } = bResult;
      if (error_a || error_b) {
        return Response.json({
          error: { error: error_a, error_b: error_b },
          go: false,
          message: "failed to update on games table with black and white id",
        });
      }
      if (data_a_update && data_b_update) {
        const response = await handleInsertStartGame(
          localSupabase,
          { joinedData: data_a[0] },
          headers
        );
        return response;
        // return Response.json(
        //   {
        //     error: null,
        //     go: true,
        //     message: `success in pairing, found ${user_color == "white" ? "black" : "white"}_user_id`,
        //     data: {data: data_a_update, data_b: data_b_update}
        //   },
        // );
      }
    }
    } else {
      return Response.json({
        message: `unsuccessful search on finding ${
          user_color == "white" ? "black" : "white"
        } user id in games`,
        go: false,
      });
    }
  } catch (error) {
    return Response.json({ message: "", go: false, error }, { headers });
  }
}

export async function getNewGamePairing(
  pairing_info: any,
  supabase: any,
  headers: {}
) {
  try {
    const { data, error } = await supabase.rpc("lookup_new_game_moves", {
      find_id: +pairing_info.data[0].id,
    });
    if (error) {
      return { go: false, error };
    }

    if (data && data?.length) {
      const found_id = data[0].found_id;
      if (found_id) {
        return {
          go: true,
          message: `new game made with game_id: ${data[0].game_id}.`,
        };
      } else {
        return {
          go: false,
          message: `no game found with reference id: ${+pairing_info.data[0]
            .id}.`,
        };
      }
    }
  } catch (error) {
    return { error, go: false };
  }
}

async function handleInsertStartGame(
  supabase: any,
  incomingData: any,
  headers: any
) {
  //to determine game_id to use in foreign key.
  const joinedData = incomingData.joinedData;
  const created_at_id_ref =
    new Date(joinedData.created_at) > new Date(joinedData.created_at_gt)
      ? joinedData.id_gt
      : joinedData.id;
  const game_id_ref = [joinedData.id, joinedData.id_gt];

  try {
    //throws error if duplicate game entry.
    //only continue if the user is the last to request a game.
    console.log("reached here:", incomingData);
    const { data, error } = await supabase
      .from("game_moves")
      .insert({ game_id: created_at_id_ref, game_id_ref })
      .select();
    if (error) {
      return Response.json(
        {
          go: false,
          error,
          message: "error on entering new row on games table",
        },
        { headers }
      );
    } else if (data) {
      return Response.json(
        {
          go: true,
          message: "successfully entered new row on games start table.",
        },
        { headers }
      );
    }
  } catch (error) {
    return Response.json(
      {
        go: false,
        error,
        message: "unknown supabase error on handleInsertStartGame",
      },
      { headers }
    );
  } finally {
    return Response.json(
      { message: "no message on insert game_moves table", go: false },
      { headers }
    );
  }
}
