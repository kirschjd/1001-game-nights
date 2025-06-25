// 1001 Game Nights - Dice Factory Game Component
// Version: 2.1.0 - Integrated all UI improvements and enhanced interactions
// Updated: December 2024

import React, { useEffect, useCallback } from 'react';

// Components
import GameHeader from './components/GameHeader';
import FactoryEffects from './components/FactoryEffects';
import PlayerDicePool from './components/PlayerDicePool';
import PlayerList from './components/PlayerList';
import GameLog from './components/GameLog';

// Hooks
import { useGameState } from './hooks/useGameState';
import { useDiceActions } from './hooks/useDiceActions';

// Types
import { DiceFactoryGameProps, ActionMode } from './types/DiceFactoryTypes';

const DiceFactoryGame: React.FC<DiceFactoryGameProps> = ({ 
  gameState, 
  socket, 
  isLeader 
}) => {
  const { 
    currentPlayer, 
    players, 
    phase, 
    activeEffects,
    winner,
    gameLog
  } = gameState;

  // Custom hooks for state and actions
  const {
    selectedDice,
    actionMode,
    message,
    messageType,
    setSelectedDice,
    showMessage,
    toggleDiceSelection,
    toggleActionMode,
    clearSelection
  } = useGameState();

  const diceActions = useDiceActions({
    gameState,
    socket,
    selectedDice,
    actionMode,
    setSelectedDice,
    setActionMode: toggleActionMode,
    showMessage
  });

  // Enhanced error handling for dice factory actions
  useEffect(() => {
    if (!socket) return;

    const handleDiceFactoryError = (data: { error: string }) => {
      console.error('Dice Factory action failed:', data.error);
      showMessage(data.error, 'error');
    };

    const handleDiceFactoryScored = (data: { type: string, points: number }) => {
      console.log('Dice Factory scored:', data);
      showMessage(`Scored ${data.points} points with ${data.type}!`, 'success');
    };

    // Register listeners
    socket.on('dice-factory-error', handleDiceFactoryError);
    socket.on('dice-factory-scored', handleDiceFactoryScored);

    // Cleanup
    return () => {
      socket.off('dice-factory-error', handleDiceFactoryError);
      socket.off('dice-factory-scored', handleDiceFactoryScored);
    };
  }, [socket, showMessage]);

  // Enhanced action mode handler with auto-execution and validation
  const handleActionModeChange = useCallback((mode: ActionMode) => {
    // If switching to recruit/promote mode with dice already selected, validate and execute
    if ((mode === 'recruit' || mode === 'promote') && selectedDice.length > 0) {
      if (!currentPlayer) return;
      
      const selectedDiceObjects = currentPlayer.dicePool.filter(die => 
        selectedDice.includes(die.id)
      );
      
      // Check if all selected dice are eligible for the action
      let allEligible = true;
      
      if (mode === 'recruit') {
        const recruitTable: Record<number, number[]> = {
          4: [1],
          6: [1, 2],
          8: [1, 2, 3],
          10: [1, 2, 3, 4],
          12: [1, 2, 3, 4, 5]
        };
        allEligible = selectedDiceObjects.every(die => 
          recruitTable[die.sides]?.includes(die.value!) && die.value !== null
        );
      } else if (mode === 'promote') {
        allEligible = selectedDiceObjects.every(die => 
          die.value === die.sides && die.value !== null
        );
      }
      
      if (allEligible) {
        // Execute action immediately
        if (mode === 'recruit') {
          diceActions.handleRecruitDice();
        } else if (mode === 'promote') {
          diceActions.handlePromoteDice();
        }
        return;
      } else {
        // Clear selection if any dice are not eligible
        clearSelection();
        showMessage(`Some selected dice are not eligible for ${mode}`, 'error');
        return;
      }
    }
    
    // Normal mode toggle
    toggleActionMode(mode);
  }, [selectedDice, currentPlayer, diceActions, clearSelection, showMessage, toggleActionMode]);

  // Enhanced dice click handler - always allow selection
  const handleDiceClick = useCallback((dieId: string) => {
    // Always allow dice selection regardless of action mode
    toggleDiceSelection(dieId);
  }, [toggleDiceSelection]);

  // Early return if no current player
  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-payne-grey-dark text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-lion">Waiting for game data...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lion mx-auto"></div>
        </div>
      </div>
    );
  }

  // Game complete state
  if (phase === 'complete' && winner) {
    const winnerPlayer = players.find(p => p.id === winner);
    const isWinner = winner === currentPlayer.id;
    
    return (
      <div className="min-h-screen bg-payne-grey-dark text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-lion">
              🎉 Game Complete!
            </h1>
            <div className="text-2xl mb-6">
              {isWinner ? (
                <span className="text-green-400">🏆 Congratulations! You won!</span>
              ) : (
                <span className="text-yellow-400">
                  🏆 {winnerPlayer?.name || 'Unknown'} wins!
                </span>
              )}
            </div>
          </div>

          {/* Final Scores */}
          <div className="bg-payne-grey/50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4 text-uranian-blue">Final Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                <div 
                  key={player.id} 
                  className={`p-4 rounded-lg border ${
                    player.id === winner 
                      ? 'border-lion bg-lion/10' 
                      : 'border-uranian-blue/30 bg-payne-grey/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">
                      {index === 0 && '🥇 '}
                      {index === 1 && '🥈 '}
                      {index === 2 && '🥉 '}
                      {player.name}
                    </span>
                    <span className="text-lion font-bold text-lg">
                      {player.score}
                    </span>
                  </div>
                  {player.hasFled && (
                    <span className="text-red-400 text-sm">Fled Factory</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Game Log */}
          <GameLog gameLog={gameLog} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-payne-grey-dark text-white relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>
      
      <div className="max-w-7xl mx-auto p-6 space-y-6 relative z-10">
        
        {/* Game Header */}
        <GameHeader 
          gameState={gameState}
        />

        {/* Factory Effects */}
        {activeEffects && activeEffects.length > 0 && (
          <FactoryEffects activeEffects={activeEffects} />
        )}

        {/* Main Content Layout */}
        <div className="space-y-6">
          
          {/* Player's Dice Pool - Full Width */}
          <PlayerDicePool
            currentPlayer={currentPlayer}
            selectedDice={selectedDice}
            actionMode={actionMode}
            message={message}
            messageType={messageType}
            onDiceClick={handleDiceClick}
            onActionModeChange={handleActionModeChange}
            actions={diceActions}
            helpers={diceActions}
            gameState={gameState}
          />

          {/* Other Players and Game Log - Below Main Pool */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlayerList 
              players={players}
              currentPlayerId={currentPlayer.id}
              phase={phase}
            />
            
            <GameLog gameLog={gameLog} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceFactoryGame;