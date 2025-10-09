import React from 'react';
import { Socket } from 'socket.io-client';
import { getCardName } from './utils/cardHelpers';

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


  const getCardColor = (cardValue: number) => {
    // Hearts and Diamonds are red, Clubs and Spades are black
    return cardValue % 2 === 0 ? 'text-tea-rose' : 'text-gray-800';
  };

  const renderCard = (cardValue: number | null, isHidden: boolean = false) => {
    if (cardValue === null || isHidden) {
      return (
        <div className="w-24 h-32 bg-payne-grey border-2 border-payne-grey-light rounded-lg flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl">🂠</span>
        </div>
      );
    }

    return (
      <div className="w-24 h-32 bg-white border-2 border-tea-rose rounded-lg flex flex-col items-center justify-center shadow-lg">
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
        <div className="bg-payne-grey/50 rounded-xl p-8 max-w-2xl mx-auto border-2 border-lion">
          <h2 className="text-4xl font-bold mb-6 text-lion">🎉 Game Over! 🎉</h2>
          <p className="text-2xl mb-6">
            <strong className="text-lion-light">{winner}</strong> wins with 5 points!
          </p>
          
          {/* Final Scores */}
          <div className="bg-payne-grey/70 rounded-lg p-6 mb-6 border border-tea-rose/30">
            <h3 className="text-xl font-semibold mb-4 text-tea-rose">Final Scores</h3>
            <div className="space-y-2">
              {players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex justify-between items-center p-3 rounded ${
                      index === 0 ? 'bg-lion/30 border border-lion' : 'bg-payne-grey/50 border border-payne-grey'
                    }`}
                  >
                    <span className="font-semibold">
                      {index === 0 ? '👑 ' : `${index + 1}. `}
                      {player.name}
                    </span>
                    <span className="text-xl font-bold text-lion">{player.score}</span>
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
      <div className="text-center bg-payne-grey/50 rounded-lg p-4 border border-tea-rose/30">
        <h2 className="text-2xl font-bold mb-2 text-tea-rose">🎴 War - Round {round}</h2>
        <p className="text-gray-300">
          {phase === 'dealing' && 'Dealing cards...'}
          {phase === 'playing' && 'Make your choice: Play or Fold?'}
          {phase === 'revealing' && 'Round results!'}
        </p>
      </div>

      {/* Scores */}
      <div className="bg-payne-grey/50 rounded-lg p-4 border border-tea-rose/30">
        <h3 className="text-lg font-semibold mb-3 text-center text-tea-rose">Scores (First to 5 wins!)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded-lg text-center border ${
                player.id === currentPlayer?.id
                  ? 'bg-tea-rose/20 border-tea-rose'
                  : 'bg-payne-grey/30 border-payne-grey'
              }`}
            >
              <div className="font-semibold text-white">{player.name}</div>
              <div className="text-2xl font-bold text-lion">{player.score}</div>
              {player.id === currentPlayer?.id && (
                <div className="text-xs text-tea-rose mt-1">(You)</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Your Card (during playing phase) */}
      {phase === 'playing' && currentPlayer && (
        <div className="bg-payne-grey/50 rounded-lg p-6 text-center border border-tea-rose/30">
          <h3 className="text-lg font-semibold mb-4 text-tea-rose">Your Card</h3>
          <div className="flex justify-center mb-6">
            {renderCard(currentPlayer.card)}
          </div>
          
          {!currentPlayer.action && (
            <div className="space-x-4">
              <button
                onClick={() => handlePlayerAction('play')}
                className="bg-lion hover:bg-lion-dark text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
              >
                🎯 Play Card
              </button>
              <button
                onClick={() => handlePlayerAction('fold')}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
              >
                😞 Fold (-1 point)
              </button>
            </div>
          )}
          
          {currentPlayer.action && (
            <div className="text-xl">
              You chose to{' '}
              <span className={currentPlayer.action === 'play' ? 'text-lion' : 'text-red-400'}>
                {currentPlayer.action}
              </span>
              ! Waiting for other players...
            </div>
          )}
        </div>
      )}

      {/* Player Actions Status (during playing phase) */}
      {phase === 'playing' && (
        <div className="bg-payne-grey/50 rounded-lg p-4 border border-tea-rose/30">
          <h3 className="text-lg font-semibold mb-3 text-center text-tea-rose">Player Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {players.map((player) => (
              <div key={player.id} className="text-center p-2 bg-payne-grey/70 rounded border border-tea-rose/20">
                <div className="font-semibold text-sm text-white">{player.name}</div>
                <div className="text-lg">
                  {player.action === 'play' && <span className="text-lion">🎯 Played</span>}
                  {player.action === 'fold' && <span className="text-red-400">😞 Folded</span>}
                  {!player.action && <span className="text-yellow-400">⏳ Thinking...</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round Results (during revealing phase) */}
      {phase === 'revealing' && (
        <div className="bg-payne-grey/50 rounded-lg p-6 text-center border border-tea-rose/30">
          <h3 className="text-xl font-semibold mb-4 text-tea-rose">Round Results</h3>
          
          {/* All players' cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {players.map((player) => (
              <div key={player.id} className="text-center">
                <div className="font-semibold mb-2 text-white">{player.name}</div>
                {player.action === 'fold' ? (
                  <div className="w-24 h-32 bg-red-800 border-2 border-red-600 rounded-lg flex items-center justify-center mx-auto">
                    <span className="text-white text-sm">FOLDED</span>
                  </div>
                ) : (
                  renderCard(player.card)
                )}
                <div className="mt-2 text-sm">
                  {player.action === 'play' ? (
                    <span className="text-lion">🎯 Played</span>
                  ) : (
                    <span className="text-red-400">😞 Folded</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Round message */}
          {roundResults && (
            <div className="text-xl mb-6 p-4 bg-tea-rose/20 rounded-lg border border-tea-rose/30">
              <span className="text-white">{roundResults.message}</span>
            </div>
          )}

          {/* Next round button (leader only) */}
          {isLeader && !winner && (
            <button
              onClick={handleNextRound}
              className="bg-lion hover:bg-lion-dark text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
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