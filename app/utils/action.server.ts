import { timeControlReducer } from "./helper";

export async function gamesNewRequestOnUserColor(
  localSupabase: any,
  userId: string,
  user_color: string,
  timeControl_req: string,
  isRated: string
) {
  try {
    const [game_length, timeControl] = timeControlReducer(timeControl_req);
    const insertObj = {
      color_flag: user_color,
      timecontrol_f: timeControl,
      game_length,
      u_id_in: userId,
      is_rated_f: isRated,
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
      return {
          error,
          go: false,
          message: `failed to insert new pairing request on ${user_color}_user_id`,
        }
    } else if (!data[0].timecontrol) {
      return {
          error,
          go: false,
          message: `Invalid row data, timecontrol entered on games pairing table`,
        }
    } else {
      return { data, go: true, message: "new pairing insert on games table." };
    }
  } catch (error) {
    return { error, go: false };
  }
};

export async function memberNewRequestPairing(
  localSupabase: any,
  userId: string,
  username: string,
  currentUserElo: Record<string, any>,
  memberData: Record<string, any>,
  user_color: string,
  game_length: string,
  isRated: string
) {
  try {
    const randomIdx = Math.floor(Math.random() * 2);
    const color_flag_arr = ["white", "black"];
    const [, ratingType] = timeControlReducer(game_length);

    user_color =
      user_color == "random" ? color_flag_arr[randomIdx] : user_color;
    let whiteelo;
    let blackelo;
    if (user_color == "white") {
      blackelo = memberData.black_username == username ? memberData.black_rating_info[ratingType] : memberData.white_rating_info[ratingType];
      whiteelo = currentUserElo[ratingType];
    } else if (user_color == "black") {
      whiteelo = memberData.white_username == username ? memberData.white_rating_info[ratingType] : memberData.black_rating_info[ratingType];
      blackelo = currentUserElo[ratingType];
    }

    const insertObj = {
      color_flag: user_color,
      game_length,
      whiteelo_f: whiteelo,
      blackelo_f: blackelo,
      u_id_in: userId,
      username_f: username,
      is_rated_f: isRated,
    };

    const { data, error } = await localSupabase.rpc(
      "insert_new_member_pairing_request",
      insertObj
    );
    if (error) {
      return {
          error,
          go: false,
          message: `failed to insert new member pairing request for ${username}`,
        }
    } else if (!data[0].timecontrol) {
      return {
          error,
          go: false,
          message: `Invalid row data, timecontrol entered on games pairing table`,
        }
    } else {
      return { data, go: true, message: "new pairing insert on games table." };
    }
  } catch (error) {
    return { error, go: false };
  }
}
