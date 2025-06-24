// 1001 Game Nights - Dice Factory Game Component
// Version: 1.3.0 - Refactored dice rendering and improved layout
// Updated: December 2024

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import DiceRenderer, { Die } from './DiceRenderer';

interface Player {
  id: string;
  name: string;
  dicePool: Die[];
  diceFloor: number;
  freePips: number;
  score: number;
  hasFled: boolean;
  isReady: boolean;
  currentTurnActions?: any[];
}

interface GameLogEntry {
  timestamp: string;
  player: string;
  message: string;
  actionType: 'info' | 'action' | 'score' | 'system' | 'error';
  round: number;
}

interface DiceFactoryGameState {
  type: string;
  phase: 'rolling' | 'playing' | 'revealing' | 'complete';
  round: number;
  turnCounter: number;
  collapseStarted: boolean;
  collapseDice: number[];
  activeEffects: any[];
  winner: string | null;
  lastCollapseRoll: string | null;
  gameLog: GameLogEntry[];
  allPlayersReady: boolean;
  players: Player[];
  currentPlayer?: Player;
  exhaustedDice?: string[];
}

interface DiceFactoryGameProps {
  gameState: DiceFactoryGameState;
  socket: Socket | null;
  isLeader: boolean;
}

const DiceFactoryGame: React.FC<DiceFactoryGameProps> = ({ gameState, socket, isLeader }) => {
  const [selectedDice, setSelectedDice] = useState<string[]>([]);
  const [actionMode, setActionMode] = useState<'promote' | 'recruit' | 'straight' | 'set' | 'pips' | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const { currentPlayer, players, phase, collapseStarted, activeEffects, winner } = gameState;

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Clear selections when action mode changes
  useEffect(() => {
    setSelectedDice([]);
  }, [actionMode]);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const canTakeActions = () => {
    return currentPlayer && !currentPlayer.hasFled && !currentPlayer.isReady && phase === 'playing';
  };

  const isExhausted = (dieId: string) => {
    return gameState.exhaustedDice?.includes(dieId) || false;
  };

  const isDieSelectable = (die: Die): boolean => {
    if (!canTakeActions() || isExhausted(die.id) || die.value === null) return false;

    switch (actionMode) {
      case 'recruit':
        // Only dice that can recruit
        const recruitTable: Record<number, number[]> = {
          4: [1],
          6: [1, 2],
          8: [1, 2, 3],
          10: [1, 2, 3, 4],
          12: [1, 2, 3, 4, 5]
        };
        return recruitTable[die.sides]?.includes(die.value!) || false;
      
      case 'promote':
      case 'straight':
      case 'set':
      case 'pips':
        return true;
      
      default:
        return false;
    }
  };

  const handleDieClick = (die: Die) => {
    if (!isDieSelectable(die)) return;

    if (actionMode === 'recruit') {
      // Immediate recruitment - no selection needed
      handleRecruitDice(die.id);
      return;
    }

    if (actionMode === 'pips' && selectedDice.length > 0) {
      // Only one die for pip actions
      setSelectedDice([die.id]);
      return;
    }

    // Toggle selection for other modes
    setSelectedDice(prev => 
      prev.includes(die.id) 
        ? prev.filter(id => id !== die.id)
        : [...prev, die.id]
    );
  };

  const renderDie = (die: Die, selectable: boolean = false, highlighted: boolean = false): JSX.Element => {
    const isSelected = selectedDice.includes(die.id);
    const exhausted = isExhausted(die.id);
    const canSelect = selectable && isDieSelectable(die);

    return (
      <DiceRenderer
        key={die.id}
        die={die}
        isSelected={isSelected}
        isExhausted={exhausted}
        canSelect={canSelect}
        highlighted={highlighted}
        onClick={() => handleDieClick(die)}
      />
    );
  };

  // Action handlers
  const handleRollDice = () => {
    if (socket) {
      socket.emit('dice-factory-roll');
    }
  };

  const handleUndo = () => {
    if (socket) {
      socket.emit('dice-factory-undo');
    }
  };

  const handleEndTurn = () => {
    if (socket) {
      socket.emit('dice-factory-end-turn');
    }
  };

  const handleFlee = () => {
    if (socket && window.confirm('Are you sure you want to flee the factory? Your points will be locked in.')) {
      socket.emit('dice-factory-flee');
    }
  };

  const handleNewGame = () => {
    if (socket && window.confirm('Start a new game with the same players?')) {
      socket.emit('dice-factory-new-game');
    }
  };

  const handlePromoteDice = () => {
    if (selectedDice.length === 0) {
      showMessage('Select at least one die to promote', 'error');
      return;
    }

    if (socket) {
      const [targetDieId, ...helperDieIds] = selectedDice;
      socket.emit('dice-factory-promote', { targetDieId, helperDieIds });
      setSelectedDice([]);
    }
  };

  const handleRecruitDice = (recruitingDieId: string) => {
    if (socket) {
      socket.emit('dice-factory-recruit', { recruitingDieId });
    }
  };

  const handleScoreStraight = () => {
    if (selectedDice.length < 2) {
      showMessage('Select at least 2-3 dice for straight', 'error');
      return;
    }

    if (socket) {
      socket.emit('dice-factory-score-straight', { diceIds: selectedDice });
      setSelectedDice([]);
    }
  };

  const handleScoreSet = () => {
    if (selectedDice.length < 3) {
      showMessage('Select at least 3-4 dice for set', 'error');
      return;
    }

    if (socket) {
      socket.emit('dice-factory-score-set', { diceIds: selectedDice });
      setSelectedDice([]);
    }
  };

  const handleModifyDie = (change: number) => {
    if (selectedDice.length !== 1) {
      showMessage('Select exactly one die to modify', 'error');
      return;
    }

    if (socket) {
      socket.emit('dice-factory-modify-die', { dieId: selectedDice[0], change });
      setSelectedDice([]);
    }
  };

  const handleRerollDie = () => {
    if (selectedDice.length !== 1) {
      showMessage('Select exactly one die to reroll', 'error');
      return;
    }

    if (socket) {
      socket.emit('dice-factory-reroll-die', { dieId: selectedDice[0] });
      setSelectedDice([]);
    }
  };

  if (!currentPlayer) {
    return (
      <div className="text-center p-8">
        <p className="text-xl text-red-400">Unable to load player data</p>
        <p className="text-gray-400 mt-2">Please try refreshing the page or returning to the lobby</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Display */}
      {message && (
        <div className={`p-3 rounded-lg text-center font-semibold ${
          messageType === 'success' ? 'bg-green-600' :
          messageType === 'error' ? 'bg-red-600' : 'bg-uranian-blue/80 text-gray-900'
        }`}>
          {message}
        </div>
      )}

      {/* Game Complete Screen */}
      {phase === 'complete' && (
        <div className="text-center p-8 bg-payne-grey/50 rounded-lg border-2 border-lion">
          <h2 className="text-4xl font-bold mb-4 text-lion">🏆 Game Complete!</h2>
          <p className="text-2xl mb-6">
            Winner: <span className="text-lion-light font-bold">{winner}</span>
          </p>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-uranian-blue">Final Scores:</h3>
            <div className="space-y-2">
              {players.map(player => (
                <div key={player.id} className={`flex justify-between items-center p-2 rounded ${
                  player.name === winner ? 'bg-lion/30 border border-lion' : 'bg-payne-grey/20 border border-payne-grey'
                }`}>
                  <span>{player.name}</span>
                  <span className="font-bold">{player.score} points</span>
                </div>
              ))}
            </div>
          </div>

          {isLeader && (
            <button
              onClick={handleNewGame}
              className="bg-lion hover:bg-lion-dark px-8 py-4 rounded-lg font-bold text-xl transition-colors text-white"
            >
              🎮 New Game (Same Players)
            </button>
          )}
        </div>
      )}

      {/* Game Status */}
      {phase !== 'complete' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
            <div className="text-2xl font-bold text-uranian-blue">{gameState.round}</div>
            <div className="text-sm text-gray-400">Round</div>
          </div>
          <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
            <div className="text-2xl font-bold text-lion">{gameState.turnCounter}</div>
            <div className="text-sm text-gray-400">Turn Counter</div>
          </div>
          <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
            <div className={`text-2xl font-bold ${collapseStarted ? 'text-red-400' : 'text-green-400'}`}>
              {collapseStarted ? 'COLLAPSING!' : 'STABLE'}
            </div>
            <div className="text-sm text-gray-400">Factory Status</div>
          </div>
          <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
            <div className="text-2xl font-bold text-yellow-400">
              {gameState.lastCollapseRoll || 'None'}
            </div>
            <div className="text-sm text-gray-400">Last Roll</div>
          </div>
        </div>
      )}

      {/* Factory Effects */}
      {activeEffects.length > 0 && (
        <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
          <h3 className="text-lg font-semibold mb-3 text-uranian-blue">🏭 Active Factory Effects</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeEffects.map((effect, index) => (
              <div key={index} className="bg-payne-grey/70 p-3 rounded border border-uranian-blue/20">
                <div className="font-semibold text-lion">{effect.name}</div>
                <div className="text-sm text-gray-300">{effect.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Player Section */}
      {phase !== 'complete' && (
        <div className={`bg-payne-grey/50 p-6 rounded-lg border border-uranian-blue/30 ${currentPlayer.isReady ? 'ring-2 ring-green-400' : ''}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-uranian-blue">
              Your Factory 
              {currentPlayer.isReady && <span className="text-green-400 ml-2">(Ready - Waiting for others)</span>}
              {currentPlayer.hasFled && <span className="text-red-400 ml-2">(Fled)</span>}
            </h3>
            <div className="flex space-x-4 text-sm">
              <span>Score: <strong className="text-lion">{currentPlayer.score}</strong></span>
              <span>Free Pips: <strong className="text-uranian-blue">{currentPlayer.freePips}</strong></span>
              <span>Dice Floor: <strong className="text-purple-400">{currentPlayer.diceFloor}</strong></span>
              {currentPlayer.currentTurnActions && (
                <span>Actions: <strong className="text-yellow-400">{currentPlayer.currentTurnActions.length}</strong></span>
              )}
            </div>
          </div>

          {/* Dice Pool */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3 text-uranian-blue">Your Dice Pool</h4>
            <div className="flex flex-wrap gap-3 p-4 bg-payne-grey/70 rounded-lg min-h-24 relative border border-uranian-blue/20">
              {currentPlayer.dicePool.map(die => 
                renderDie(die, canTakeActions(), actionMode === 'recruit')
              )}
              {currentPlayer.dicePool.length === 0 && (
                <div className="text-gray-500 italic">No dice in pool</div>
              )}
            </div>
          </div>

          {/* Action Controls */}
          {canTakeActions() && (
            <div className="space-y-4">
              {/* Primary Controls */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRollDice}
                  className="bg-uranian-blue hover:bg-uranian-blue/80 px-6 py-2 rounded transition-colors font-semibold text-gray-900"
                >
                  🎲 Roll All Dice
                </button>
                
                <button
                  onClick={() => setActionMode(actionMode === 'recruit' ? null : 'recruit')}
                  className={`px-4 py-2 rounded transition-colors font-semibold ${
                    actionMode === 'recruit' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                  }`}
                >
                  👥 Recruit Dice
                </button>

                <button
                  onClick={() => setActionMode(actionMode === 'promote' ? null : 'promote')}
                  className={`px-4 py-2 rounded transition-colors font-semibold ${
                    actionMode === 'promote' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                  }`}
                >
                  ⬆️ Promote Dice
                </button>

                <button
                  onClick={() => setActionMode(actionMode === 'pips' ? null : 'pips')}
                  className={`px-4 py-2 rounded transition-colors font-semibold ${
                    actionMode === 'pips' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                  }`}
                >
                  💎 Use Free Pips
                </button>
              </div>

              {/* Scoring Controls */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActionMode(actionMode === 'straight' ? null : 'straight')}
                  className={`px-4 py-2 rounded transition-colors font-semibold ${
                    actionMode === 'straight' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                  }`}
                >
                  📈 Score Straight
                </button>

                <button
                  onClick={() => setActionMode(actionMode === 'set' ? null : 'set')}
                  className={`px-4 py-2 rounded transition-colors font-semibold ${
                    actionMode === 'set' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                  }`}
                >
                  🎯 Score Set
                </button>
              </div>

              {/* Action Instructions */}
              <div className="bg-payne-grey/70 p-3 rounded text-sm border border-uranian-blue/20">
                {!actionMode && <span className="text-gray-400">Select an action mode above to interact with your dice</span>}
                {actionMode === 'promote' && (
                  <span className="text-uranian-blue">Click dice to select: First die = target to promote, additional dice = helpers for pips</span>
                )}
                {actionMode === 'recruit' && (
                  <span className="text-uranian-blue">Click highlighted dice to recruit new dice! (d4 on 1s, d6 on 1-2s, etc.)</span>
                )}
                {actionMode === 'straight' && (
                  <span className="text-uranian-blue">Select 2+ dice with consecutive values (1-2-3, 2-3-4, etc.)</span>
                )}
                {actionMode === 'set' && (
                  <span className="text-uranian-blue">Select 3+ dice with the same value</span>
                )}
                {actionMode === 'pips' && (
                  <span className="text-uranian-blue">Select one die to modify (+1 = 4 pips, -1 = +3 pips) or reroll (2 pips)</span>
                )}
              </div>

              {/* Action Execution Buttons */}
              {actionMode && (
                <div className="flex flex-wrap gap-2">
                  {actionMode === 'promote' && (
                    <button
                      onClick={handlePromoteDice}
                      disabled={selectedDice.length < 1}
                      className="bg-lion hover:bg-lion-dark disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors font-semibold text-white"
                    >
                      ⬆️ Promote ({selectedDice.length} selected)
                    </button>
                  )}
                  
                  {actionMode === 'straight' && (
                    <button
                      onClick={handleScoreStraight}
                      disabled={selectedDice.length < 2}
                      className="bg-lion hover:bg-lion-dark disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors font-semibold text-white"
                    >
                      📈 Score Straight ({selectedDice.length} selected)
                    </button>
                  )}
                  
                  {actionMode === 'set' && (
                    <button
                      onClick={handleScoreSet}
                      disabled={selectedDice.length < 3}
                      className="bg-lion hover:bg-lion-dark disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors font-semibold text-white"
                    >
                      🎯 Score Set ({selectedDice.length} selected)
                    </button>
                  )}

                  {actionMode === 'pips' && selectedDice.length === 1 && (
                    <>
                      <button
                        onClick={() => handleModifyDie(1)}
                        className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded transition-colors font-semibold text-white"
                      >
                        +1 Value (4 pips)
                      </button>
                      <button
                        onClick={() => handleModifyDie(-1)}
                        className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded transition-colors font-semibold text-white"
                      >
                        -1 Value (+3 pips)
                      </button>
                      <button
                        onClick={handleRerollDie}
                        className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded transition-colors font-semibold text-white"
                      >
                        Reroll (2 pips)
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setActionMode(null);
                      setSelectedDice([]);
                    }}
                    className="bg-payne-grey hover:bg-payne-grey-light px-4 py-2 rounded transition-colors text-white border border-uranian-blue/30"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Turn Control Buttons - Always at bottom */}
          <div className="flex gap-4 mt-6 pt-4 border-t border-uranian-blue/30">
            <button
              onClick={handleUndo}
              disabled={!canTakeActions() || !currentPlayer.currentTurnActions || currentPlayer.currentTurnActions.length === 0}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors font-bold text-white"
            >
              ↶ Undo Last ({currentPlayer.currentTurnActions?.length || 0} actions)
            </button>
            
            <button
              onClick={handleEndTurn}
              disabled={!canTakeActions()}
              className="flex-1 bg-lion hover:bg-lion-dark disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors font-bold text-white"
            >
              ✅ End Turn
            </button>

            {collapseStarted && (
              <button
                onClick={handleFlee}
                disabled={!canTakeActions()}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors font-bold text-white"
              >
                🚪 Flee!
              </button>
            )}
          </div>
        </div>
      )}

      {/* Other Players - Moved below My Factory */}
      {phase !== 'complete' && (
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-uranian-blue">Other Players</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.filter(p => p.id !== currentPlayer.id).map(player => (
              <div key={player.id} className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/20">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-white">{player.name}</h4>
                  <div className="text-sm space-x-2">
                    {player.isReady && <span className="text-green-400">✓ Ready</span>}
                    {player.hasFled && <span className="text-red-400">🚪 Fled</span>}
                  </div>
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>Score: <span className="text-lion font-semibold">{player.score}</span></div>
                  <div>Free Pips: <span className="text-uranian-blue">{player.freePips}</span></div>
                  <div>Dice: <span className="text-purple-400">{player.dicePool.length}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Log */}
      <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
        <h3 className="text-lg font-semibold mb-3 text-uranian-blue">📜 Game Log</h3>
        <div className="bg-payne-grey/70 p-3 rounded max-h-64 overflow-y-auto border border-uranian-blue/20">
          {gameState.gameLog.slice(-20).map((entry, index) => (
            <div key={index} className={`text-sm mb-1 ${
              entry.actionType === 'error' ? 'text-red-400' :
              entry.actionType === 'score' ? 'text-lion' :
              entry.actionType === 'system' ? 'text-yellow-400' :
              'text-gray-300'
            }`}>
              <span className="text-gray-500">[{entry.timestamp}]</span>
              <span className="font-semibold"> {entry.player}:</span> {entry.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiceFactoryGame;