import React from 'react';
import { Socket } from 'socket.io-client';

interface WarPlayer {
  id: string;
  name: string;
  score: number;
  card: number | null;
  hasPlayed: boolean;
  hasFolded: boolean;
  action: 'play' | 'fold' | null;
}

interface WarGameState {
  type: string;
  phase: 'dealing' | 'playing' | 'revealing' | 'complete';
  round: number;
  winner: string | null;
  players: WarPlayer[];
  roundResults: {
    message: string;
    winner: string | null;
    highCard: number | null;
  } | null;
  currentPlayer?: WarPlayer;
}

interface WarGameProps {
  gameState: WarGameState;
  socket: Socket | null;
  isLeader: boolean;
}

const WarGame: React.FC<WarGameProps> = ({ gameState, socket, isLeader }) => {
  const { phase, round, winner, players, roundResults, currentPlayer } = gameState;

  const handlePlayerAction = (action: 'play' | 'fold') => {
    if (socket && currentPlayer && phase === 'playing') {
      socket.emit('war-player-action', { action });
    }
  };

  const handleNextRound = () => {
    if (socket && isLeader && phase === 'revealing') {
      socket.emit('war-next-round');
    }
  };

  const getCardName = (cardValue: number) => {
    const cardNames: { [key: number]: string } = {
      1: 'Ace', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
      8: '8', 9: '9', 10: '10', 11: 'Jack', 12: 'Queen', 13: 'King'
    };
    return cardNames[cardValue] || cardValue.toString();
  };

  const getCardColor = (cardValue: number) => {
    // Hearts and Diamonds are red, Clubs and Spades are black
    // For simplicity, we'll alternate colors based on value
    return cardValue % 2 === 0 ? 'text-red-400' : 'text-gray-800';
  };

  const renderCard = (cardValue: number | null, isHidden: boolean = false) => {
    if (cardValue === null || isHidden) {
      return (
        <div className="w-24 h-32 bg-blue-600 border-2 border-blue-400 rounded-lg flex items-center justify-center">
          <span className="text-white text-2xl">🂠</span>
        </div>
      );
    }

    return (
      <div className="w-24 h-32 bg-white border-2 border-gray-300 rounded-lg flex flex-col items-center justify-center shadow-lg">
        <span className={`text-2xl font-bold ${getCardColor(cardValue)}`}>
          {getCardName(cardValue)}
        </span>
        <span className="text-4xl">
          {cardValue % 4 === 0 ? '♠️' : cardValue % 4 === 1 ? '♥️' : cardValue % 4 === 2 ? '♦️' : '♣️'}
        </span>
      </div>
    );
  };

  if (phase === 'complete') {
    return (
      <div className="text-center">
        <div className="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-green-400">🎉 Game Over! 🎉</h2>
          <p className="text-2xl mb-6">
            <strong>{winner}</strong> wins with 5 points!
          </p>
          
          {/* Final Scores */}
          <div className="bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Final Scores</h3>
            <div className="space-y-2">
              {players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex justify-between items-center p-3 rounded ${
                      index === 0 ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className="font-semibold">
                      {index === 0 ? '👑 ' : `${index + 1}. `}
                      {player.name}
                    </span>
                    <span className="text-xl font-bold">{player.score}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="text-center bg-gray-800 rounded-lg p-4">
        <h2 className="text-2xl font-bold mb-2">🎴 War - Round {round}</h2>
        <p className="text-gray-300">
          {phase === 'dealing' && 'Dealing cards...'}
          {phase === 'playing' && 'Make your choice: Play or Fold?'}
          {phase === 'revealing' && 'Round results!'}
        </p>
      </div>

      {/* Scores */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 text-center">Scores (First to 5 wins!)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded-lg text-center ${
                player.id === currentPlayer?.id
                  ? 'bg-blue-600 border-2 border-blue-400'
                  : 'bg-gray-700'
              }`}
            >
              <div className="font-semibold">{player.name}</div>
              <div className="text-2xl font-bold text-green-400">{player.score}</div>
              {player.id === currentPlayer?.id && (
                <div className="text-xs text-blue-200 mt-1">(You)</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Your Card (during playing phase) */}
      {phase === 'playing' && currentPlayer && (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">Your Card</h3>
          <div className="flex justify-center mb-6">
            {renderCard(currentPlayer.card)}
          </div>
          
          {!currentPlayer.action && (
            <div className="space-x-4">
              <button
                onClick={() => handlePlayerAction('play')}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                🎯 Play Card
              </button>
              <button
                onClick={() => handlePlayerAction('fold')}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                😞 Fold (-1 point)
              </button>
            </div>
          )}
          
          {currentPlayer.action && (
            <div className="text-xl">
              You chose to{' '}
              <span className={currentPlayer.action === 'play' ? 'text-green-400' : 'text-red-400'}>
                {currentPlayer.action}
              </span>
              ! Waiting for other players...
            </div>
          )}
        </div>
      )}

      {/* Player Actions Status (during playing phase) */}
      {phase === 'playing' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-center">Player Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {players.map((player) => (
              <div key={player.id} className="text-center p-2 bg-gray-700 rounded">
                <div className="font-semibold text-sm">{player.name}</div>
                <div className="text-lg">
                  {player.action === 'play' && '🎯 Played'}
                  {player.action === 'fold' && '😞 Folded'}
                  {!player.action && '⏳ Thinking...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round Results (during revealing phase) */}
      {phase === 'revealing' && (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <h3 className="text-xl font-semibold mb-4">Round Results</h3>
          
          {/* All players' cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {players.map((player) => (
              <div key={player.id} className="text-center">
                <div className="font-semibold mb-2">{player.name}</div>
                {player.action === 'fold' ? (
                  <div className="w-24 h-32 bg-red-800 border-2 border-red-600 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-white text-sm">FOLDED</span>
                  </div>
                ) : (
                  renderCard(player.card)
                )}
                <div className="mt-2 text-sm">
                  {player.action === 'play' ? '🎯 Played' : '😞 Folded'}
                </div>
              </div>
            ))}
          </div>

          {/* Round message */}
          {roundResults && (
            <div className="text-xl mb-6 p-4 bg-blue-900 rounded-lg">
              {roundResults.message}
            </div>
          )}

          {/* Next round button (leader only) */}
          {isLeader && !winner && (
            <button
              onClick={handleNextRound}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              ▶️ Next Round
            </button>
          )}
          
          {!isLeader && !winner && (
            <p className="text-gray-400">Waiting for lobby leader to start next round...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WarGame;