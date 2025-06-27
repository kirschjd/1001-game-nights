// 1001 Game Nights - Dice Factory Game Component
// Version: 2.1.1 - Restructured factory panels: split effects/modifications, moved below player area
// Updated: December 2024

import React, { useEffect, useCallback } from 'react';

// Components
import GameHeader from './components/GameHeader';
import ActiveFactoryEffects from './components/ActiveFactoryEffects';
import ActiveFactoryModifications from './components/ActiveFactoryModifications';
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
    toggleActionMode
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
          recruitTable[die.sides]?.includes(die.value!)
        );
      } else if (mode === 'promote') {
        allEligible = selectedDiceObjects.every(die => 
          die.value === die.sides && die.sides < 12
        );
      }
      
      if (allEligible) {
        // Auto-execute the action
        if (mode === 'recruit') {
          diceActions.handleRecruitDice();
        } else if (mode === 'promote') {
          diceActions.handlePromoteDice();
        }
        return;
      }
    }
    
    // Normal mode change
    toggleActionMode(mode);
  }, [selectedDice, currentPlayer, diceActions, toggleActionMode]);

  const handleDiceClick = useCallback((dieId: string) => {
    toggleDiceSelection(dieId);
  }, [toggleDiceSelection]);

  // Game complete screen
  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-payne-grey-dark text-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-lion">🏆 Game Complete!</h1>
          {winner && (
            <h2 className="text-2xl text-uranian-blue">Winner: {winner}</h2>
          )}
          
          <div className="bg-payne-grey/50 p-6 rounded-lg border border-uranian-blue/30">
            <h3 className="text-xl font-semibold mb-4 text-uranian-blue">Final Scores</h3>
            <div className="space-y-2">
              {[...players].sort((a, b) => b.score - a.score).map((player, index) => (
                <div 
                  key={player.id}
                  className={`p-3 rounded border ${
                    index === 0 
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

        {/* Main Content Layout */}
        <div className="space-y-6">
          
          {/* Player's Dice Pool - "Your Factory" */}
          {currentPlayer && (
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
          )}

          {/* Factory Effects and Modifications - Below Your Factory, Stacked Vertically */}
          <div className="space-y-6">
            
            {/* Active Factory Effects Panel */}
            <ActiveFactoryEffects 
              effects={activeEffects || []} 
            />

            {/* Active Factory Modifications Panel */}
            <ActiveFactoryModifications 
              modifications={activeEffects || []} 
            />
          </div>

          {/* Other Players and Game Log - Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlayerList 
              players={players}
              currentPlayerId={currentPlayer?.id || ''}
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