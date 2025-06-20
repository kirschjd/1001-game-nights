import React, { useState } from 'react';
import { Socket } from 'socket.io-client';

interface Die {
  sides: number;
  value: number | null;
  shiny: boolean;
  rainbow: boolean;
  id: string;
}

interface DiceFactoryPlayer {
  id: string;
  name: string;
  dicePool: Die[];
  diceFloor: number;
  freePips: number;
  score: number;
  hasFled: boolean;
  hasActed: boolean;
}

interface FactoryEffect {
  name: string;
  description: string;
}

interface DiceFactoryGameState {
  type: string;
  phase: 'rolling' | 'playing' | 'revealing' | 'complete';
  round: number;
  turnCounter: number;
  currentPlayerIndex: number;
  collapseStarted: boolean;
  collapseDice: number[];
  activeEffects: FactoryEffect[];
  winner: string | null;
  players: DiceFactoryPlayer[];
  currentPlayer?: DiceFactoryPlayer;
}

interface DiceFactoryGameProps {
  gameState: DiceFactoryGameState;
  socket: Socket | null;
  isLeader: boolean;
}

const DiceFactoryGame: React.FC<DiceFactoryGameProps> = ({ gameState, socket, isLeader }) => {
  const [selectedDice, setSelectedDice] = useState<string[]>([]);
  const [actionMode, setActionMode] = useState<'promote' | 'straight' | 'set' | 'recruit'>('promote');
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const { phase, round, turnCounter, collapseStarted, players, currentPlayer, activeEffects } = gameState;

  // Recruitment table
  const recruitTable: { [key: number]: { [key: number]: number } } = {
    4: { 1: 4 },
    6: { 1: 6, 2: 4 },
    8: { 1: 8, 2: 6, 3: 4 },
    10: { 1: 10, 2: 8, 3: 6, 4: 4 },
    12: { 1: 12, 2: 10, 3: 8, 4: 6, 5: 4 }
  };

  const canRecruit = (die: Die): number | null => {
    if (!die.value) return null;
    return recruitTable[die.sides]?.[die.value] || null;
  };

  const handleDieClick = (dieId: string) => {
    if (actionMode === 'recruit') {
      // Handle recruitment
      const die = currentPlayer?.dicePool.find(d => d.id === dieId);
      if (die && canRecruit(die)) {
        handleRecruitDice(dieId);
      }
      return;
    }
    
    // Handle selection for other modes
    setSelectedDice(prev => 
      prev.includes(dieId) 
        ? prev.filter(id => id !== dieId)
        : [...prev, dieId]
    );
  };

  const handleRollDice = () => {
    if (socket && currentPlayer) {
      socket.emit('dice-factory-roll', {});
    }
  };

  const handlePromoteDice = () => {
    if (socket && selectedDice.length >= 1) {
      const targetDieId = selectedDice[0];
      const helperDieIds = selectedDice.slice(1);
      
      socket.emit('dice-factory-promote', {
        targetDieId,
        helperDieIds
      });
      
      setSelectedDice([]);
    }
  };

  const handleRecruitDice = (dieId: string) => {
    if (socket) {
      socket.emit('dice-factory-recruit', { recruitingDieId: dieId });
    }
  };

  const handleScoreStraight = () => {
    if (socket && selectedDice.length >= 2) {
      socket.emit('dice-factory-score-straight', { diceIds: selectedDice });
      setSelectedDice([]);
    }
  };

  const handleScoreSet = () => {
    if (socket && selectedDice.length >= 3) {
      socket.emit('dice-factory-score-set', { diceIds: selectedDice });
      setSelectedDice([]);
    }
  };

  const handleEndTurn = () => {
    if (socket) {
      socket.emit('dice-factory-end-turn', {});
      setSelectedDice([]);
    }
  };

  const getDieColor = (die: Die) => {
    const colors: { [key: number]: string } = {
      4: 'bg-red-500 border-red-400',
      6: 'bg-blue-500 border-blue-400', 
      8: 'bg-green-500 border-green-400',
      10: 'bg-purple-500 border-purple-400',
      12: 'bg-yellow-500 border-yellow-400'
    };
    return colors[die.sides] || 'bg-gray-500 border-gray-400';
  };

  const renderDie = (die: Die, canClick: boolean = true, showRecruitInfo: boolean = false) => {
    const isSelected = selectedDice.includes(die.id);
    const color = getDieColor(die);
    const recruitSize = canRecruit(die);
    const canRecruitThis = actionMode === 'recruit' && recruitSize;
    
    return (
      <div
        key={die.id}
        onClick={() => canClick && handleDieClick(die.id)}
        className={`
          relative w-16 h-16 ${color} rounded-lg border-2 
          flex flex-col items-center justify-center text-white font-bold
          cursor-pointer transition-all duration-200 hover:scale-105
          ${isSelected ? 'ring-4 ring-white scale-110' : ''}
          ${canRecruitThis ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
          ${!canClick ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="text-lg">{die.value || '?'}</div>
        <div className="text-xs">d{die.sides}</div>
        
        {die.shiny && <span className="absolute -top-1 -right-1 text-xs">✨</span>}
        {die.rainbow && <span className="absolute -top-1 -left-1 text-xs">🌈</span>}
        
        {/* Show recruitment info */}
        {showRecruitInfo && recruitSize && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-xs px-1 rounded">
            →d{recruitSize}
          </div>
        )}
      </div>
    );
  };

  const renderPlayerDicePool = (player: DiceFactoryPlayer, isExpanded: boolean) => {
    if (!isExpanded) return null;
    
    return (
      <div className="mt-3 p-3 bg-gray-900 rounded-lg">
        <div className="flex flex-wrap gap-2 mb-2">
          {player.dicePool.map(die => renderDie(die, false))}
        </div>
        <div className="text-sm text-gray-400">
          Free Pips: {player.freePips} | Dice Floor: {player.diceFloor}
          {player.hasFled && <span className="text-red-400 ml-2">(FLED)</span>}
          {player.hasActed && <span className="text-green-400 ml-2">(Turn Complete)</span>}
        </div>
      </div>
    );
  };

  if (phase === 'complete') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    return (
      <div className="text-center">
        <div className="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-green-400">🎲 Factory Shutdown! 🎲</h2>
          
          <div className="bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Final Scores</h3>
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex justify-between items-center p-3 rounded ${
                    index === 0 ? 'bg-yellow-600' : 'bg-gray-600'
                  }`}
                >
                  <span className="font-semibold">
                    {index === 0 ? '👑 ' : `${index + 1}. `}
                    {player.name} {player.hasFled ? '(Escaped)' : '(Crushed)'}
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
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">🏭 Dice Factory - Round {round}</h2>
            <p className="text-gray-300">
              Turn Counter: {turnCounter} 
              {collapseStarted && <span className="text-red-400 ml-2">⚠️ COLLAPSING!</span>}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Collapse Dice:</div>
            <div>{gameState.collapseDice.map(d => `d${d}`).join(' + ')}</div>
          </div>
        </div>
      </div>

      {/* Factory Effects */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">🔧 Factory Effects</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {activeEffects.map((effect, index) => (
            <div key={index} className="bg-gray-700 p-3 rounded-lg">
              <div className="font-semibold text-blue-400">{effect.name}</div>
              <div className="text-sm text-gray-300">{effect.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Player's Area */}
      {currentPlayer && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Your Factory</h3>
            <div className="flex space-x-4 text-sm">
              <span>Score: <strong className="text-green-400">{currentPlayer.score}</strong></span>
              <span>Free Pips: <strong className="text-blue-400">{currentPlayer.freePips}</strong></span>
              <span>Dice Floor: <strong className="text-purple-400">{currentPlayer.diceFloor}</strong></span>
            </div>
          </div>

          {/* Dice Pool */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">Your Dice Pool</h4>
            <div className="flex flex-wrap gap-3 p-4 bg-gray-900 rounded-lg min-h-24 relative">
              {currentPlayer.dicePool.map(die => 
                renderDie(die, phase === 'playing' && !currentPlayer.hasActed, actionMode === 'recruit')
              )}
              {currentPlayer.dicePool.length === 0 && (
                <div className="text-gray-500 italic">No dice in pool</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {phase === 'playing' && !currentPlayer.hasActed && (
            <div className="space-y-4">
              {/* Mode Selection */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActionMode('promote')}
                  className={`px-4 py-2 rounded transition-colors ${
                    actionMode === 'promote' ? 'bg-purple-600 text-white' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                >
                  ⬆️ Promote Dice
                </button>
                <button
                  onClick={() => setActionMode('recruit')}
                  className={`px-4 py-2 rounded transition-colors ${
                    actionMode === 'recruit' ? 'bg-orange-600 text-white' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                >
                  👥 Recruit Dice
                </button>
                <button
                  onClick={() => setActionMode('straight')}
                  className={`px-4 py-2 rounded transition-colors ${
                    actionMode === 'straight' ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                >
                  📈 Score Straight
                </button>
                <button
                  onClick={() => setActionMode('set')}
                  className={`px-4 py-2 rounded transition-colors ${
                    actionMode === 'set' ? 'bg-yellow-600 text-white' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                >
                  🎯 Score Set
                </button>
              </div>

              {/* Action Instructions */}
              <div className="bg-gray-700 p-3 rounded text-sm">
                {actionMode === 'promote' && (
                  <span>Select dice to promote. First die = target, others = helpers. Need enough pips to upgrade.</span>
                )}
                {actionMode === 'recruit' && (
                  <span>Click dice that show recruiting values (highlighted) to gain new dice!</span>
                )}
                {actionMode === 'straight' && (
                  <span>Select 3+ dice with consecutive values (1-2-3, 2-3-4, etc.)</span>
                )}
                {actionMode === 'set' && (
                  <span>Select 4+ dice with the same value</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRollDice}
                  className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded transition-colors"
                >
                  🎲 Roll All Dice
                </button>
                
                {actionMode === 'promote' && (
                  <button
                    onClick={handlePromoteDice}
                    disabled={selectedDice.length < 1}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors"
                  >
                    ⬆️ Promote ({selectedDice.length} selected)
                  </button>
                )}
                
                {actionMode === 'straight' && (
                  <button
                    onClick={handleScoreStraight}
                    disabled={selectedDice.length < 2}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors"
                  >
                    📈 Score Straight ({selectedDice.length} selected)
                  </button>
                )}
                
                {actionMode === 'set' && (
                  <button
                    onClick={handleScoreSet}
                    disabled={selectedDice.length < 3}
                    className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors"
                  >
                    🎯 Score Set ({selectedDice.length} selected)
                  </button>
                )}
                
                <button
                  onClick={handleEndTurn}
                  className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded transition-colors"
                >
                  ✅ End Turn
                </button>
              </div>

              {/* Selected dice info */}
              {selectedDice.length > 0 && actionMode !== 'recruit' && (
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-sm">
                    Selected dice: {selectedDice.length} | 
                    Values: {selectedDice.map(id => {
                      const die = currentPlayer.dicePool.find(d => d.id === id);
                      return die ? `d${die.sides}(${die.value})` : '?';
                    }).join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentPlayer.hasActed && (
            <div className="bg-green-900 p-4 rounded-lg text-center">
              <p className="text-green-200">✅ Turn completed! Waiting for other players...</p>
            </div>
          )}
        </div>
      )}

      {/* All Players Scores with Expandable Details */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Player Scores</h3>
        <div className="space-y-3">
          {players.map((player) => (
            <div key={player.id} className="bg-gray-700 rounded-lg">
              <div
                onClick={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-600 ${
                  player.id === currentPlayer?.id
                    ? 'ring-2 ring-blue-400'
                    : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold">{player.name}</span>
                    {player.id === currentPlayer?.id && (
                      <span className="text-blue-200 text-sm ml-2">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl font-bold text-green-400">{player.score}</span>
                    <span className="text-sm text-gray-300">{player.dicePool.length} dice</span>
                    <span className="text-lg">
                      {expandedPlayer === player.id ? '▼' : '▶️'}
                    </span>
                  </div>
                </div>
              </div>
              {renderPlayerDicePool(player, expandedPlayer === player.id)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiceFactoryGame;