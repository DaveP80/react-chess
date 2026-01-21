import React, { useEffect, useState } from "react";
import DemoUser from "./DemoUser";
import { TbUserCog } from "react-icons/tb";
import {
  Form,
  NavLink,
  useLoaderData,
  useNavigate,
  useRouteLoaderData,
} from "@remix-run/react";
import { loader } from "~/root";
import { profileWonLossOrient } from "~/utils/helper";
import { Chess } from "chess.js";

export default function UserProfile() {
  //const GamePlayContext = useContext(GlobalContext);
  // const UserInfo = useContext(GlobalContext);
  const { user, rowData, provider } = useRouteLoaderData<typeof loader>("root");
  const Data = useLoaderData();
  const [gameHistory, setGameHistory] = useState([]);
  const [hadRoutingId, setHadRoutingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      if (provider === "github") {
        window.localStorage.setItem(
          "auth",
          JSON.stringify({ new_signup: false, is_logged_in: true })
        );
      }
      if (provider === "email") {
        window.localStorage.setItem(
          "auth",
          JSON.stringify({ new_signup: true, is_logged_in: true })
        );
      }
    }
    if (Data?.data) {
      const arrayData = Data?.data.filter(
        (item: Record<string, any>) => item.status == "end"
      );
      setGameHistory(arrayData);
      const findRoutingIds = Data?.data.filter(
        (item: Record<string, any>) => item.status == "playing"
      ).sort((a, b) => { return a.id - b.id });
      if (findRoutingIds.length) {
        setHadRoutingId(findRoutingIds[findRoutingIds.length - 1]?.id);
        localStorage.setItem(
          "pgnInfo",
          JSON.stringify({
            routing_id: findRoutingIds[findRoutingIds.length - 1]?.id
          }));
      }

    }

    return () => {
      true;
    };
  }, [rowData, user, Data]);

  const handleClick = () => {
    navigate("/settings");
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl">
        {user?.id ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start">
              <img
                className="w-32 h-32 rounded-full border-4 border-gray-300"
                src={rowData?.avatarURL}
                alt={`${rowData?.username || "placeholders"}'s avatar`}
              />
              <div className="sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left">
                <div className="flex justify-evenly">
                  <h1 className="text-3xl font-bold text-gray-800">
                    {rowData?.username ||
                      `chessplayer_`.concat(
                        Math.floor(Math.random() * (100 - 1 + 1) + 1).toString()
                      )}
                  </h1>
                  <button
                    className="sm:px-4 sm:py-2 hover:shadow-sm"
                    onClick={handleClick}
                  >
                    <TbUserCog size={"40px"} />
                  </button>
                </div>
                <div className="flex items-center justify-center sm:justify-start mt-2">
                  <span
                    className={`h-3 w-3 rounded-full mr-2 ${rowData?.isActive ? "bg-green-500" : "bg-gray-400"
                      }`}
                  ></span>
                  <span className="text-sm text-gray-600">
                    {rowData?.isActive ? "Currently in a game" : "idle"}
                  </span>
                  {hadRoutingId && (
                    <NavLink className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 
                    text-sm font-medium text-gray-700 border border-gray-300 
                    shadow-sm hover:bg-gray-50 hover:border-gray-400 
                    transition-all" to={`/game/${hadRoutingId}`}>
                      Go To Game
                      <span className="text-gray-400">→</span>

                    </NavLink>
                  )}
                </div>
                <div className="mt-4 flex space-x-2 justify-center sm:justify-start">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                    Find other Players
                  </button>
                </div>
                <div className="mt-1 flex space-x-2 justify-center sm:justify-start">
                  <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300">
                    Add To Favorites
                  </button>
                </div>
                {rowData?.verified ? (
                  <></>
                ) : (
                  <div className="mt-1 flex space-x-2 justify-center sm:justify-start">
                    <button
                      onClick={() => navigate("/settings")}
                      className="bg-red-900 hover:bg-red-300 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                    >
                      Confirm your email.
                    </button>
                  </div>
                )}
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
                    {rowData.rating.blitz_rating}
                  </div>
                  <div className="text-sm text-gray-500">Blitz Rating</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {rowData.rating.rapid_rating}
                  </div>
                  <div className="text-sm text-gray-500">Rapid Rating</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {rowData.rating.bullet_rating}
                  </div>
                  <div className="text-sm text-gray-500">Bullet Rating</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {gameHistory?.length || "new account"}
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
                        <div className="">
                          <p className="font-semibold">
                            vs{" "}
                            <NavLink
                              key={game.id}
                              className="ml-1"
                              to={`/member/${profileWonLossOrient(game, user) == "white"
                                ? game.black_username
                                : game.white_username
                                }`}
                            >
                              {profileWonLossOrient(game, user) == "white"
                                ? game.black_username
                                : game.white_username}
                            </NavLink>
                            <NavLink
                              to={`/analysis/game/${game.id}`}
                              className="relative group"
                            >
                              ↗️
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 
                   text-xs font-medium text-white bg-slate-900 rounded shadow-lg
                   opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                   transition-all duration-200 delay-150
                   pointer-events-none whitespace-nowrap z-10">
                                Analyze
                              </span>
                            </NavLink>
                            <span
                              className={`font-bold ${game.pgn_info.result === "1-0"
                                ? profileWonLossOrient(game, user) == "white"
                                  ? "text-green-500"
                                  : "text-red-500"
                                : game.pgn_info.result === "0-1"
                                  ? profileWonLossOrient(game, user) == "white"
                                    ? "text-red-500"
                                    : "text-green-500"
                                  : "text-gray-500"
                                }`}
                            >
                              {game.pgn_info.result == "1-0"
                                ? profileWonLossOrient(game, user) == "white"
                                  ? "Won"
                                  : "Lost"
                                : game.pgn_info.result == "0-1"
                                  ? profileWonLossOrient(game, user) == "black"
                                    ? "Won"
                                    : "Lost"
                                  : "Draw"}
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">
                            moves: {(() => { const z = new Chess(); const r = game.pgn.map((item) => { const arr = item.split("$"); const l = z.move({ from: arr[0], to: arr[1], promotion: "q" }); return l.san; }); return r })()}
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
