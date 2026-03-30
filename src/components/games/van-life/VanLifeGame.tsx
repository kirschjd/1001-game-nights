import React from 'react';
import AlaskaMap from './components/AlaskaMap';
import { VanLifeGameProps } from './types/VanLifeTypes';

const VanLifeGame: React.FC<VanLifeGameProps> = ({ socket, gameState, isLeader, slug }) => {
  const handleClaimRoute = (routeId: string) => {
    socket.emit('van-life:claim-route', { slug, routeId });
  };

  return (
    <div className="min-h-screen bg-payne-grey-dark p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-200" style={{ fontFamily: 'Georgia, serif' }}>
              Van Life
            </h1>
            <p className="text-payne-grey-light text-sm">Alaska National Parks</p>
          </div>
          <div className="flex gap-3">
            {gameState.players.map(player => (
              <div
                key={player.id}
                className="px-3 py-1 rounded-full text-sm font-medium border"
                style={{ borderColor: player.color, color: player.color }}
              >
                {player.name}: {player.score}pts
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-amber-900/40">
          <AlaskaMap
            claimedRoutes={gameState.claimedRoutes || []}
            onClaimRoute={handleClaimRoute}
          />
        </div>

        <div className="mt-4 text-center text-payne-grey-light text-xs">
          {gameState.phase === 'LOBBY' && 'Waiting for game to start...'}
          {gameState.phase === 'PLAYING' && gameState.currentTurn && (
            <span>
              {gameState.currentTurn === socket?.id
                ? "It's your turn — click a route to claim it"
                : 'Waiting for other player...'}
            </span>
          )}
          {gameState.phase === 'GAME_OVER' && 'Game over!'}
        </div>
      </div>
    </div>
  );
};

export default VanLifeGame;
