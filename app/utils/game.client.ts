import { createNewGameTable } from "./supabase.gameplay";

export async function handleInsertedNewGame(
  localSupabase: any,
  userId: any,
  user_color: string,
  game_length: any,
  created_at: string,
  isRated: boolean,
) {
  try {
    const { data: data_a, error: error_a } = await localSupabase.rpc(
      user_color == "random"
        ? `get_random_pairing_by_id_join`
        : `get_${user_color == "white" ? "black" : "white"}_pairing_by_id_join`,
      { u_id: userId, timecontrol_f: game_length, is_rated_f: isRated }
    );
    if (error_a) {
      return {
        error: error_a,
        go: false,
        message: `failed lookup black user searching`,
      };
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
          return {
            error,
            go: false,
            message: "failed to update on games table with black and white id",
          };
        } else {
          const response = await handleInsertStartGame(
            localSupabase,
            { joinedData: data_a[0] },
            game_length,
            updateLiveObj
          );
          return response;
        }
      }
    } else {
      return {
        message: `update games table on other client user.`,
        go: false,
      };
    }
  } catch (error) {
    return { message: "", go: false, error };
  }
}

export function getNewGamePairing(actionData: any, payload: any) {

  const newRow = payload?.new;

  if (
    newRow &&
    (newRow?.game_id == +actionData.id || newRow?.game_id_b == +actionData.id)
  ) {
    return {
      go: true,
      message: `new game made with game_id: ${newRow.game_id}, ${newRow.game_id_b}.`,
      data: { navigateId: newRow.id, newgame_data: newRow },
    };
  } else {
    return {
      go: false,
      message: `no game found with reference id: ${+actionData.id.id}.`,
    };
  }
}

export async function getNewMemberGamePairing(actionData: any, supabase: any) {
  try {
    //returns 1 row of data if found
    const { data, error } = await supabase.rpc("lookup_new_game_moves", {
      find_id: +actionData.id,
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
          message: `no game found with reference id: ${+actionData.id.id}.`,
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
          is_rated: joinedData.is_rated ? "rated" : "unrated",
          eco: ""
        },
        is_rated: joinedData.is_rated,
      })
      .select();
    if (error) {
      return {
        go: false,
        error,
        message: "unknown supabase error on handleInsertStartGame",
      };
    } else if (data) {
      const { data: newTableData, error: newTableError } =
        await createNewGameTable(supabase, data[0].id);
      if (newTableError) {
        return {
          go: false,
          error,
          message: "error on creating new game number table",
        };
      }
      return {
          go: true,
          message:
            "successfully entered new row on games start table and made a new table game_number_table_" +
            data[0].id,
        };
      }
  } catch (error) {
    return {
        go: false,
        error,
        message: "unknown supabase error on handleInsertStartGame",
      };
}
}

export async function handleInsertStartMemberGame(
  supabase: any,
  userId: any,
  setMemberRequest: (prev: any) => {}
) {
  //to determine game_id to use in foreign key.
  try {
    const { data: supData, error: error_a } = await supabase.rpc(
      `get_member_pairing_by_id`,
      { u_id_in: userId }
    );
    if (error_a) {
      return {
        error: error_a,
        message: "error on: get_member_pairing_by_id",
        ok: false,
      };
    }
    //throws error if duplicate game entry.
    //only continue if the user is the first to request a game.
    //TODO: more infmation needed to enter on game_moves table.
    if (supData && !supData.length) {
      return { ok: false, message: "no games_pairing data on user id." };
    }
    setMemberRequest((prev: Record<string, any>) => ({
      ...prev,
      actionData: supData[0],
    }));
  } catch (error) {
    return {
      go: false,
      error,
      message: "unknown supabase error on handleInsertStartMemberGame",
    };
  }
};

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
};