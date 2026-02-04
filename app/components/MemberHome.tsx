import React, { useContext, useEffect, useState } from "react";
import DemoUser from "./DemoUser";
import {
  NavLink,
  useLoaderData,
  useNavigate,
  useParams,
  useRouteLoaderData,
} from "@remix-run/react";
import { loader } from "~/root";
import { generateMemberRequestFormObj, memberWonLossOrient } from "~/utils/helper";
import { GlobalContext } from "~/context/globalcontext";

export default function MemberProfile() {
  //const GamePlayContext = useContext(GlobalContext);
  // const UserInfo = useContext(GlobalContext);
  const { user, rowData } = useRouteLoaderData<typeof loader>("root");
  const Data = useLoaderData();
  const [gameHistory, setGameHistory] = useState([]);
  const PlayContext = useContext(GlobalContext);
  const { username } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (Data?.data) {
      const arrayData = Data.data.filter((item) => item.status == "end");
      setGameHistory(arrayData);
    }

    return () => {
      true;
    };
  }, [Data]);

  let orientation = "";
  if (Data?.data[0]?.white_username == username) {
    orientation = "white";
  } else {
    orientation = "black";
  }

  const memberRequestFormTempObj = generateMemberRequestFormObj(Data?.data[0]);

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl">
        {user?.id ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start">
              <img
                className="w-32 h-32 rounded-full border-4 border-gray-300"
                src={
                  orientation == "white"
                    ? Data?.data[0]?.white_avatarurl
                    : Data?.data[0]?.black_avatarurl
                }
                alt={`${username || "placeholders"}'s avatar`}
              />
              <div className="sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left">
                <div className="flex justify-evenly">
                  <h1 className="text-3xl font-bold text-gray-800">
                    {username}
                  </h1>
                </div>
                <div className="flex items-center justify-center sm:justify-start mt-2">
                  <span
                    className={`h-3 w-3 rounded-full mr-2 ${
                      (
                        orientation == "white"
                          ? Data?.data[0].white_isactive
                          : Data?.data[0].black_isactive
                      )
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  ></span>
                  <span className="text-sm text-gray-600">
                    {(
                      orientation == "white"
                        ? Data?.data[0].white_isactive
                        : Data?.data[0].black_isactive
                    )
                      ? "Currently in a game"
                      : "idle"}
                  </span>
                </div>
                <div className="mt-4 flex space-x-2 justify-center sm:justify-start">
                  <button onClick={() => {PlayContext.setMemberRequestForm({...PlayContext.memberRequestForm, memberData: memberRequestFormTempObj}); navigate(`/member/challenge/${username}`)}} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                    Challenge
                  </button>
                </div>
                <div className="mt-1 flex space-x-2 justify-center sm:justify-start">
                  <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300">
                    Add Friend
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Rating Profile
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {orientation == "white"
                      ? Data?.data[0].white_rating_info.blitz_rating
                      : Data?.data[0].black_rating_info.blitz_rating}
                  </div>
                  <div className="text-sm text-gray-500">Blitz Rating</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {orientation == "white"
                      ? Data?.data[0].white_rating_info.rapid_rating
                      : Data?.data[0].black_rating_info.rapid_rating}
                  </div>
                  <div className="text-sm text-gray-500">Rapid Rating</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {orientation == "white"
                      ? Data?.data[0].white_rating_info.bullet_rating
                      : Data?.data[0].black_rating_info.bullet_rating}
                  </div>
                  <div className="text-sm text-gray-500">Bullet Rating</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {Data?.data?.length || "new account"}
                  </div>
                  <div className="text-sm text-black">Total Games Played</div>
                </div>
              </div>
            </div>

            {/* Game History */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Game History
              </h2>
              <ul className="space-y-4">
                {gameHistory?.length > 0 &&
                  gameHistory.map((game) => {
                    return (
                      <li
                        key={game.id}
                        className="bg-gray-50 p-4 rounded-lg flex justify-between items-center hover:bg-gray-100 transition"
                      >
                        <div>
                          <p className="font-semibold">
                            vs{" "}
                            <NavLink
                              key={game.id}
                              className="ml-1"
                              to={
                                (memberWonLossOrient(game, username) == "white"
                                  ? game.black_username
                                  : game.white_username) == rowData.username
                                  ? "/myhome"
                                  : `/member/${
                                      memberWonLossOrient(game, username) ==
                                      "white"
                                        ? game.black_username
                                        : game.white_username
                                    }`
                              }
                            >
                              {memberWonLossOrient(game, username) == "white"
                                ? game.black_username
                                : game.white_username}
                            </NavLink>
                            <NavLink to={`/game/${game.id}`}>
                            ↗️
                            </NavLink>
                            <span
                              className={`font-bold ${
                                game.pgn_info.result === "1-0"
                                  ? memberWonLossOrient(game, username) ==
                                    "white"
                                    ? "text-green-500"
                                    : "text-red-500"
                                  : game.pgn_info.result === "0-1"
                                  ? memberWonLossOrient(game, username) ==
                                    "white"
                                    ? "text-red-500"
                                    : "text-green-500"
                                  : "text-gray-500"
                              }`}
                            >
                              {game.pgn_info.result == "1-0"
                                ? memberWonLossOrient(game, username) == "white"
                                  ? "Won"
                                  : "Lost"
                                : game.pgn_info.result == "0-1"
                                ? memberWonLossOrient(game, username) == "black"
                                  ? "Won"
                                  : "Lost"
                                : "Draw"}
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">
                            moves: {game.pgn.map((item) => item.split("$")[1])}
                          </p>
                        </div>
                        <span className="text-sm text-gray-400">
                          {new Date(game.created_at).toDateString()}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        ) : (
          <DemoUser />
        )}
      </div>
    </div>
  );
}
