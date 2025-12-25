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
        }
        case "5": {
          timeControl = "blitz_rating";
          game_length = "5";
        }
        case "10": {
          timeControl = "rapid_rating";
          game_length = "10";
        }
        case "unlimited": {
          timeControl = "rapid_rating";
          game_length = "unlimited";
        }
      }
      const { data, error } = await localSupabase.rpc(
        "insert_new_pairing_request",
        {
          color_flag: user_color,
          timecontrol: timeControl,
          game_length,
          u_id: userId,
        }
      );
      if (error) {
        return Response.json(
          {
            error,
            go: false,
            message: `failed to pair and find a ${user_color}_user_id`,
          },
          { headers }
        );
      } else if (data && data[0]) {
        const { data: data_a, error: error_a } = await localSupabase.rpc(
          `get_${user_color == "white" ? "black" : "white"}_pairing_by_id_join`,
          { u_id: userId, timecontrol: game_length }
        );
        if (error_a) {
          return Response.json(
            {
              error: error_a,
              go: false,
              message: `failed lookup black user searching`,
            },
            { headers }
          );
        }
        if (data_a && data_a[0]?.length) {
          const updateObjWhite = { ...data_a[0] };
          const id = updateObjWhite.id;
          const id_gt = updateObjWhite.id_gt;
          Reflect.deleteProperty(updateObjWhite, data_a[0].id);
          Reflect.deleteProperty(updateObjWhite, data_a[0].id_gt);
          Reflect.deleteProperty(updateObjWhite, data_a[0].created_at_gt);
          Reflect.deleteProperty(updateObjWhite, data_a[0].created_at);
          Reflect.deleteProperty(updateObjWhite, data_a[0].TimeControl);
          Reflect.deleteProperty(updateObjWhite, data_a[0].status);
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
              { headers }
            );
          } else {
            return Response.json(
              {
                error: null,
                go: true,
                message: `success in pairing, found ${user_color == "white" ? "black" : "white"}_user_id`,
                data: {data: data_a_update, data_b: data_b_update}
              },
              { headers }
            );
          }
        } else {
          return Response.json(
            {
              message: "unsuccessful search on finding black user id in games",
              go: false,
            },
            { headers }
          );
        }
      } else {
        return Response.json(
          { message: "sql unsuccessful", go: true },
          { headers }
        );
      }
    } else {
      return Response.json(
        { message: "random not implemented yet", go: true },
        { headers }
      );
    }
  } catch (error) {
    return Response.json({ error }, { headers });
  }
}
