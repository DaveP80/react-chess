import { Link, useRouteLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { loader } from '~/root';

export default function CreateGame() {
  const { rowData } = useRouteLoaderData<typeof loader>("root");
  const [routingId, setRoutingId] = useState("/play/online");
  useEffect(() => {
    setRoutingId(JSON.parse(window.localStorage.getItem("pgnInfo") || "{}")?.routing_id);
  
    return () => {
      true
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <h1 className="text-6xl font-extrabold mb-6 text-center leading-tight">
        Play Chess Online
      </h1>
      <p className="text-xl text-slate-300 mb-10 text-center max-w-2xl">
        Challenge yourself with an interactive chess experience built with Remix and react-chessboard.
      </p>
      <Link
        to={rowData?.isActive ? (routingId ? `/game/${routingId}` : "/play/online") : "/play/online"}
        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold rounded-xl shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
      >
        {rowData?.isActive ? "Continue Game" : "Start New Game"}
      </Link>
      <p className="mt-12 text-md text-slate-400">
        Powered by Remix and react-chessboard
      </p>
    </div>
  );
}