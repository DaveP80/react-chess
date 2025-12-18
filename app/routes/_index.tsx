import type { MetaFunction } from '@remix-run/node';
import CreateGame from '~/components/CreateGame';

export const meta: MetaFunction = () => {
  return [
    { title: 'Chess Game - Play Online' },
    { name: 'description', content: 'Interactive chess game built with Remix and react-chessboard' },
  ];
};

export default function Index() {
 

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <CreateGame/>
  
    </div>
  );
}
