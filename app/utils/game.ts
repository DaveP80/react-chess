import { timeControlReducer } from "./helper";
import { createNewGameTable } from "./supabase.gameplay";

export async function gamesNewRequestOnUserColor(
  localSupabase: any,
  userId: string,
  headers: {},
  user_color: string,
  timeControl_req: string,
  isRated: boolean
) {
  try {
    const [game_length, timeControl] = timeControlReducer(timeControl_req);
    const insertObj = {
      color_flag: user_color,
      timecontrol_f: timeControl,
      game_length,
      u_id_in: userId,
      is_rated_f: isRated
    };
    if (user_color == "random") {
      Reflect.deleteProperty(insertObj, "color_flag");
    }
    const { data, error } = await localSupabase.rpc(
      user_color == "random"
        ? "insert_new_random_pairing_request"
        : "insert_new_pairing_request",
      insertObj
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
    } else if (!data[0].timecontrol) {
      return Response.json(
        {
          error,
          go: false,
          message: `Invalid row data, timecontrol entered on games pairing table`,
        },
        { headers }
      );
    }
    else {
      return Response.json(
        { data, go: true, message: "new pairing insert on games table." },
        { headers }
      );
    }
  } catch (error) {
    return Response.json({ error, go: false }, { headers });
  }
}

export async function handleInsertedNewGame(
  localSupabase: any,
  userId: any,
  user_color: string,
  game_length: any,
  created_at: string,
  isRated: boolean,
  headers: any
) {
  try {
    const { data: data_a, error: error_a } = await localSupabase.rpc(
      user_color == "random"
        ? `get_random_pairing_by_id_join`
        : `get_${user_color == "white" ? "black" : "white"}_pairing_by_id_join`,
      { u_id: userId, timecontrol_f: game_length, is_rated_f: isRated }
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
      const pairingArr = [
        [updateObjWhite.blackelo, updateObjWhite.black_id, id_gt],
        [updateObjWhite.whiteelo, updateObjWhite.white_id, id],
      ];
      const randomIdx = Math.floor(Math.random() * 2);
      const randomIdx2 = randomIdx == 1 ? 0 : 1;
      const greater_at =
        new Date(data_a[0].created_at) > new Date(data_a[0].created_at_gt)
          ? data_a[0].created_at
          : data_a[0].created_at_gt;
      const continue_request = greater_at == created_at;
      if (!continue_request) {
        const updateLiveObj = {
          black_elo_update:
            user_color !== "random"
              ? updateObjWhite.blackelo
              : pairingArr[randomIdx][0],
          white_elo_update:
            user_color !== "random"
              ? updateObjWhite.whiteelo
              : pairingArr[randomIdx2][0],
          black_id_update:
            user_color !== "random"
              ? updateObjWhite.black_id
              : pairingArr[randomIdx][1],
          white_id_update:
            user_color !== "random"
              ? updateObjWhite.white_id
              : pairingArr[randomIdx2][1],
          white_g_update_id:
            user_color !== "random" ? id : pairingArr[randomIdx2][2],
          black_g_update_id:
            user_color !== "random" ? id_gt : pairingArr[randomIdx][2],
        };
        const { data: rpcData, error } = await localSupabase.rpc(
          "update_live_pairing_request",
          updateLiveObj
        );
        if (error) {
          return Response.json({
            error,
            go: false,
            message: "failed to update on games table with black and white id",
          });
        } else {
          const response = await handleInsertStartGame(
            localSupabase,
            { joinedData: data_a[0] },
            game_length,
            updateLiveObj,
            headers
          );
          return response;
        }
      }
    } else {
      return Response.json({
        message: `update games table on other client user.`,
        go: false,
      });
    }
  } catch (error) {
    return Response.json({ message: "", go: false, error }, { headers });
  }
}

export async function getNewGamePairing(actionData: any, supabase: any) {
  try {
    //returns 1 row of data if found
    const { data, error } = await supabase.rpc("lookup_new_game_moves", {
      find_id: +actionData.data[0].id,
    });
    if (error) {
      return { go: false, error };
    }

    if (data && data?.length) {
      if (data[0].found_id) {
        return {
          go: true,
          message: `new game made with game_id: ${data[0].game_id}, ${data[0].game_id_b}.`,
          data: { navigateId: data[0].id, newgame_data: data[0] },
        };
      } else {
        return {
          go: false,
          message: `no game found with reference id: ${+actionData.data[0].id
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
  game_length: string,
  updateLiveObj: Record<string, any>,
  headers: any
) {
  //to determine game_id to use in foreign key.
  const joinedData = incomingData.joinedData;

  try {
    //throws error if duplicate game entry.
    //only continue if the user is the first to request a game.
    //TODO: more infmation needed to enter on game_moves table.
    const { data, error } = await supabase
      .from("game_moves")
      .insert({
        game_id: Math.min(+joinedData.id, +joinedData.id_gt),
        game_id_b: Math.max(+joinedData.id, +joinedData.id_gt),
        pgn: [],
        pgn_info: {
          date: new Date().toISOString(),
          //game_moves id
          gameid: 0,
          round: 1,
          white: updateLiveObj.white_id_update,
          black: updateLiveObj.black_id_update,
          result: "",
          termination: "",
          whiteelo: updateLiveObj.white_elo_update,
          blackelo: updateLiveObj.black_elo_update,
          time_control: game_length,
          is_rated: joinedData.is_rated ? "rated" : "unrated"
        },
        is_rated: joinedData.is_rated
      })
      .select();
    if (error) {
      return Response.json(
        {
          go: false,
          error,
          message: "unknown supabase error on handleInsertStartGame",
        },
        { headers }
      );
    } else if (data) {
      const { data: newTableData, error: newTableError } =
        await createNewGameTable(supabase, data[0].id);
      if (newTableError) {
        return Response.json(
          {
            go: false,
            error,
            message: "error on creating new game number table",
          },
          { headers }
        );
      }
      return Response.json(
        {
          go: true,
          message:
            "successfully entered new row on games start table and made a new table game_number_table_" +
            data[0].id,
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
  }
}

export async function updateActiveUserStatus(userId: any, supabase: any) {
  try {
    const { data, error } = await supabase
      .from("users")
      .update({ isActive: true })
      .eq("u_id", userId);
    if (error) {
      return { go: false, error };
    } else {
      return {
        go: true,
        message: `user table updated on id: ${userId}.`,
      };
    }
  } catch (error) {
    return { error, go: false };
  }
}



