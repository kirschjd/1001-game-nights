import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { getCardName, getCardEmoji } from './utils/cardHelpers';

interface Player {
  id: string;
  name: string;
  score: number;
  card: number | null;
  hasPlayed: boolean;
  hasFolded: boolean;
  action: string | null;
  isBot?: boolean;
}

interface GameState {
  type: string;
  variant: string;
  variantDisplayName: string;
  phase: string;
  round: number;
  winner: string | null;
  players: Player[];
  roundResults: {
    message: string;
    winner: string | null;
    highCard: number | null;
  } | null;
  currentPlayer?: Player;
}

interface EnhancedWarGameProps {
  socket: Socket;
  gameState: GameState;
  isLeader: boolean;
}

const EnhancedWarGame: React.FC<EnhancedWarGameProps> = ({
  socket,
  gameState,
  isLeader
}) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAction(null);
    }, [gameState.round, gameState.phase]);
  
  const currentPlayer = gameState.currentPlayer;
  const canAct = gameState.phase === 'playing' && currentPlayer && !currentPlayer.action;

  useEffect(() => {
    console.log('EnhancedWarGame: Game state updated', {
      phase: gameState.phase,
      round: gameState.round,
      currentPlayer: gameState.currentPlayer?.name,
      currentPlayerAction: gameState.currentPlayer?.action,
      canAct: canAct
    });
  }, [gameState, canAct]);

  const handleAction = (action: string) => {
    if (!canAct) return;
    
    setSelectedAction(action);
    socket.emit('enhanced-war-action', { action });
  };

  const handleNextRound = () => {
    console.log('Next round clicked, phase:', gameState.phase);
    if (gameState.phase === 'revealing') {
      console.log('Sending enhanced-war-next-round event');
      socket.emit('enhanced-war-next-round');
    }
  };


  const renderPlayer = (player: Player, isCurrentPlayer: boolean = false) => {
    const hasActed = player.action !== null;
    const cardVisible = gameState.phase === 'revealing' || isCurrentPlayer;
    
    return (
      <div 
        key={player.id}
        className={`p-4 rounded-lg border-2 transition-all ${
          isCurrentPlayer 
            ? 'border-tea-rose bg-tea-rose/10' 
            : 'border-gray-600 bg-payne-grey/30'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`font-bold ${isCurrentPlayer ? 'text-tea-rose' : 'text-white'}`}>
              {player.name}
            </span>
            {player.isBot && (
              <span className="px-2 py-1 bg-uranian-blue/20 text-uranian-blue text-xs rounded border border-uranian-blue/30">
                BOT
              </span>
            )}
          </div>
          <span className="text-white font-semibold">
            Score: {player.score}
          </span>
        </div>
        
        {/* Card Display */}
        <div className="mb-3">
          {cardVisible && player.card !== null ? (
            <div className="text-center">
              <div className="text-3xl mb-1">{getCardEmoji(player.card)}</div>
              <div className="text-white font-bold">{getCardName(player.card)}</div>
            </div>
          ) : gameState.phase === 'playing' && !isCurrentPlayer ? (
            <div className="text-center">
              <div className="text-3xl mb-1">🎴</div>
              <div className="text-gray-400">Hidden</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl mb-1">⬜</div>
              <div className="text-gray-400">No Card</div>
            </div>
          )}
        </div>

        {/* Action Status */}
        {gameState.phase === 'playing' && (
          <div className="text-center">
            {hasActed ? (
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                player.action === 'play' 
                  ? 'bg-green-900/50 text-green-300 border border-green-600' 
                  : 'bg-red-900/50 text-red-300 border border-red-600'
              }`}>
                {player.action === 'play' ? 'Playing' : 'Folded'}
              </span>
            ) : (
              <span className="px-3 py-1 rounded text-sm font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-600">
                {player.isBot ? 'Thinking...' : 'Deciding...'}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-payne-grey-dark text-white p-6">
      {/* Game Header */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center space-x-4 mb-2">
          <img 
            src="/assets/icon-war.jpg" 
            alt="War"
            className="w-12 h-12 rounded border-2 border-tea-rose"
          />
          <div>
            <h1 className="text-3xl font-bold text-tea-rose">
              {gameState.variantDisplayName}
            </h1>
            <p className="text-gray-300">Round {gameState.round}</p>
          </div>
        </div>
        
        {gameState.variant === 'aces-high' && (
          <div className="inline-block px-4 py-2 bg-tea-rose/20 border border-tea-rose/40 rounded-lg">
            <span className="text-tea-rose font-semibold">🎯 Aces Always Win!</span>
          </div>
        )}
      </div>

      {/* Game Complete */}
      {gameState.phase === 'complete' && gameState.winner && (
        <div className="mb-6 p-6 bg-green-900/30 border border-green-600 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-green-300 mb-2">
            🎉 Game Complete!
          </h2>
          <p className="text-xl text-white">
            <strong>{gameState.winner}</strong> wins the game!
          </p>
        </div>
      )}

      {/* Round Results */}
      {gameState.roundResults && gameState.phase === 'revealing' && (
        <div className="mb-6 p-4 bg-tea-rose/20 border border-tea-rose/40 rounded-lg text-center">
          <p className="text-lg text-white font-semibold">
            {gameState.roundResults.message}
          </p>
          {!gameState.winner && (
            <button
              onClick={handleNextRound}
              className="mt-4 px-6 py-2 bg-tea-rose text-payne-grey-dark font-bold rounded-lg hover:bg-tea-rose-light transition-colors"
            >
              Next Round
            </button>
          )}
        </div>
      )}

      {/* ADD THIS DEBUG SECTION HERE (before line 187): */}
      <div className="mb-4 text-white p-4 bg-red-900/20 border border-red-600 rounded">
        <div>Current Player: {currentPlayer?.name || 'None'}</div>
        <div>Can Act: {canAct ? 'Yes' : 'No'}</div>
        <div>Phase: {gameState.phase}</div>
        <div>Player Action: {currentPlayer?.action || 'None'}</div>
      </div>

      {/* Current Player Actions */}
      {canAct && currentPlayer && (
        <div className="mb-6 p-6 bg-tea-rose/10 border-2 border-tea-rose rounded-lg">

          <div className="text-xs text-gray-400 mb-2">
            DEBUG - Phase: {gameState.phase}, Action: {currentPlayer.action || 'none'}, CanAct: {canAct.toString()}
          </div>
          
          <h3 className="text-xl font-bold text-tea-rose mb-4 text-center">
            Your Turn - You have: {getCardName(currentPlayer.card!)} {getCardEmoji(currentPlayer.card!)}
          </h3>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => handleAction('play')}
              disabled={selectedAction !== null}
              className={`px-8 py-4 rounded-lg font-bold text-lg transition-colors ${
                selectedAction === 'play'
                  ? 'bg-green-700 text-white'
                  : selectedAction === null
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              ✊ Play Card
            </button>
            <button
              onClick={() => handleAction('fold')}
              disabled={selectedAction !== null}
              className={`px-8 py-4 rounded-lg font-bold text-lg transition-colors ${
                selectedAction === 'fold'
                  ? 'bg-red-700 text-white'
                  : selectedAction === null
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              🏳️ Fold (-1 pt)
            </button>
          </div>
          <div className="text-center mt-4 text-gray-300 text-sm">
            Play: Risk your card to win/lose points • Fold: Take -1 point safely
          </div>
        </div>
      )}

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {gameState.players.map(player => 
          renderPlayer(player, player.id === currentPlayer?.id)
        )}
      </div>

      {/* Phase Status */}
      <div className="mt-6 text-center">
        <div className="inline-block px-4 py-2 bg-payne-grey rounded-lg border border-gray-600">
          <span className="text-gray-300">
            Phase: <span className="text-white font-semibold capitalize">{gameState.phase}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWarGame;