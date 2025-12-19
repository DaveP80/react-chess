import React, { useContext } from 'react';
import { GlobalContext } from '~/context/globalcontext';
import Login from './Login';

// Mock data for demonstration purposes
const Mockuser = {
  username: 'ChessMaster123',
  avatarUrl: 'https://cdn3.iconfinder.com/data/icons/family-member-flat-happy-family-day/512/Uncle-64.png', // Placeholder avatar
  isPlaying: true,
  stats: {
    rating: 1500,
    wins: 42,
    losses: 18,
    draws: 5,
  },
};

const gameHistory = [
  { id: 1, opponent: 'GrandmasterJoe', result: 'Win', moves: 42, date: '2023-10-26' },
  { id: 2, opponent: 'RookieRook', result: 'Win', moves: 35, date: '2023-10-25' },
  { id: 3, opponent: 'PawnProphet', result: 'Loss', moves: 50, date: '2023-10-24' },
  { id: 4, opponent: 'KnightRider', result: 'Draw', moves: 68, date: '2023-10-23' },
];

export default function UserProfile({context}) {
    const playingGame = useContext(GlobalContext);
  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl">
        {context?.user ?
        (
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start">
            <img
              className="w-32 h-32 rounded-full border-4 border-gray-300"
              src={Mockuser.avatarUrl}
              alt={`${Mockuser.username}'s avatar`}
            />
            <div className="sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-800">{Mockuser.username}</h1>
              <div className="flex items-center justify-center sm:justify-start mt-2">
                <span className={`h-3 w-3 rounded-full mr-2 ${playingGame ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                <span className="text-sm text-gray-600">{playingGame ? 'Currently in a game' : 'Offline'}</span>
              </div>
              <div className="mt-4 flex space-x-2 justify-center sm:justify-start">
                <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
                  Challenge
                </button>
                <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300">
                  Add Friend
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-50 p-4 rounded-lg"><div className="text-2xl font-bold text-blue-600">{Mockuser.stats.rating}</div><div className="text-sm text-gray-500">Rating</div></div>
              <div className="bg-gray-50 p-4 rounded-lg"><div className="text-2xl font-bold text-green-600">{Mockuser.stats.wins}</div><div className="text-sm text-gray-500">Wins</div></div>
              <div className="bg-gray-50 p-4 rounded-lg"><div className="text-2xl font-bold text-red-600">{Mockuser.stats.losses}</div><div className="text-sm text-gray-500">Losses</div></div>
              <div className="bg-gray-50 p-4 rounded-lg"><div className="text-2xl font-bold text-gray-600">{Mockuser.stats.draws}</div><div className="text-sm text-gray-500">Draws</div></div>
            </div>
          </div>

          {/* Game History */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Game History</h2>
            <ul className="space-y-4">
              {gameHistory.map((game) => (
                <li key={game.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center hover:bg-gray-100 transition">
                  <div>
                    <p className="font-semibold">vs {game.opponent} - <span className={`font-bold ${game.result === 'Win' ? 'text-green-500' : game.result === 'Loss' ? 'text-red-500' : 'text-gray-500'}`}>{game.result}</span></p>
                    <p className="text-sm text-gray-500">{game.moves} moves</p>
                  </div>
                  <span className="text-sm text-gray-400">{game.date}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        ) :
        <Login/>
    }
      </div>
    </div>
  );
}