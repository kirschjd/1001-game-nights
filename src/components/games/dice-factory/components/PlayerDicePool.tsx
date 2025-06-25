// 1001 Game Nights - Enhanced Player Dice Pool Component
// Version: 2.1.0 - Complete UI redesign per specifications
// Updated: December 2024

import React, { useState, useCallback } from 'react';
import DiceRenderer from './DiceRenderer';
import { 
  Player, 
  Die,
  ActionMode, 
  DiceActionHandlers, 
  GameStateHelpers,
  MessageType
} from '../types/DiceFactoryTypes';

interface PlayerDicePoolProps {
  currentPlayer: Player;
  selectedDice: string[];
  actionMode: ActionMode;
  message: string;
  messageType: MessageType;
  onDiceClick: (dieId: string) => void;
  onActionModeChange: (mode: ActionMode) => void;
  actions: DiceActionHandlers;
  helpers: GameStateHelpers;
  gameState: any; // For checking collapse status
}

const PlayerDicePool: React.FC<PlayerDicePoolProps> = ({
  currentPlayer,
  selectedDice,
  actionMode,
  message,
  messageType,
  onDiceClick,
  onActionModeChange,
  actions,
  helpers,
  gameState
}) => {
  const { canTakeActions, isDieSelectable, isExhausted } = helpers;
  const [pendingEndTurn, setPendingEndTurn] = useState(false);

  // Enhanced dice click handler - FIXED: Always allow selection
  const handleDiceClick = useCallback((dieId: string) => {
    // Always allow dice selection first
    onDiceClick(dieId);
    
    // Then check for immediate actions only if in specific modes
    if (actionMode === 'recruit') {
      const clickedDie = currentPlayer.dicePool.find(d => d.id === dieId);
      if (clickedDie && isDieSelectable(clickedDie, 'recruit')) {
        // Small delay to allow selection to register first
        setTimeout(() => actions.handleRecruitDice(), 100);
        return;
      }
    }
    
    if (actionMode === 'promote') {
      const clickedDie = currentPlayer.dicePool.find(d => d.id === dieId);
      if (clickedDie && isDieSelectable(clickedDie, 'promote')) {
        // Small delay to allow selection to register first
        setTimeout(() => actions.handlePromoteDice(), 100);
        return;
      }
    }
  }, [actionMode, currentPlayer.dicePool, isDieSelectable, actions, onDiceClick]);

  // Enhanced action mode handler with auto-execution and validation
  const handleActionModeChange = useCallback((mode: ActionMode) => {
    // If switching to recruit/promote mode with dice already selected, validate and execute
    if ((mode === 'recruit' || mode === 'promote') && selectedDice.length > 0) {
      if (!currentPlayer) return;
      
      const selectedDiceObjects = currentPlayer.dicePool.filter(die => 
        selectedDice.includes(die.id)
      );
      
      // Check if all selected dice are eligible
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
          actions.handleRecruitDice();
        } else if (mode === 'promote') {
          actions.handlePromoteDice();
        }
        return;
      } else {
        // Clear selection if any dice are not eligible
        // This should trigger in the parent component
        onActionModeChange(null);
        return;
      }
    }

    // Handle process mode - execute immediately if dice are selected
    if (mode === 'process' && selectedDice.length > 0) {
      actions.handleProcessDice();
      return;
    }
    
    // Normal mode toggle
    onActionModeChange(mode);
  }, [selectedDice, currentPlayer, actions, onActionModeChange]);

  const renderDie = (die: Die) => {
    const isSelected = selectedDice.includes(die.id);
    const isClickable = canTakeActions() && die.value !== null; // FIXED: Always allow selection
    const exhausted = isExhausted(die.id);

    return (
      <div
        key={die.id}
        onClick={() => isClickable ? handleDiceClick(die.id) : undefined}
        className={`relative transition-transform ${
          isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'
        } ${isSelected ? 'ring-2 ring-lion' : ''} ${exhausted ? 'opacity-50' : ''}`}
      >
        <DiceRenderer 
          die={die} 
          size="lg" 
          glowing={isSelected}
          dimmed={exhausted}
        />
        {exhausted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
            <span className="text-red-400 font-bold text-xs">USED</span>
          </div>
        )}
        {(actionMode === 'recruit' || actionMode === 'promote') && die.value !== null && (
          <div className="absolute -top-1 -right-1 bg-uranian-blue text-white text-xs px-1 rounded">
            {die.value}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-payne-grey/50 p-6 rounded-lg border border-uranian-blue/30 ${
      currentPlayer.isReady ? 'ring-2 ring-green-400' : ''
    }`}>
      {/* Player Header - REMOVED Actions count */}
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
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg border ${
          messageType === 'error' ? 'bg-red-900/50 border-red-400 text-red-400' :
          messageType === 'success' ? 'bg-green-900/50 border-green-400 text-green-400' :
          'bg-uranian-blue/20 border-uranian-blue text-uranian-blue'
        }`}>
          {message}
        </div>
      )}

      {/* Dice Pool */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-3 text-uranian-blue">Your Dice Pool</h4>
        <div className="flex flex-wrap gap-3 p-4 bg-payne-grey/70 rounded-lg min-h-24 relative border border-uranian-blue/20">
          {currentPlayer.dicePool.map(die => renderDie(die))}
          {currentPlayer.dicePool.length === 0 && (
            <div className="text-gray-500 italic">No dice in pool</div>
          )}
        </div>
      </div>

      {/* Action Controls */}
      {canTakeActions() && (
        <div className="space-y-4">
          
          {/* GAME ACTIONS SECTION */}
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-uranian-blue">Game Actions</h5>
            
            {/* Main Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Recruit Button */}
              <button
                onClick={() => handleActionModeChange(actionMode === 'recruit' ? null : 'recruit')}
                className={`px-4 py-2 rounded transition-colors font-semibold focus:outline-none ${
                  actionMode === 'recruit' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                }`}
              >
                👥 Recruit
              </button>

              {/* Promote Button */}
              <button
                onClick={() => handleActionModeChange(actionMode === 'promote' ? null : 'promote')}
                className={`px-4 py-2 rounded transition-colors font-semibold focus:outline-none ${
                  actionMode === 'promote' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                }`}
              >
                ⬆️ Promote
              </button>

              {/* Process Button */}
              <button
                onClick={() => handleActionModeChange(actionMode === 'process' ? null : 'process')}
                className={`px-4 py-2 rounded transition-colors font-semibold focus:outline-none ${
                  actionMode === 'process' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                }`}
              >
                🔄 Process
              </button>

              {/* Free Pips Button */}
              <button
                onClick={() => handleActionModeChange(actionMode === 'freepips' ? null : 'freepips')}
                className={`px-4 py-2 rounded transition-colors font-semibold focus:outline-none ${
                  actionMode === 'freepips' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                }`}
              >
                💎 Free Pips
              </button>

              {/* Score Button */}
              <button
                onClick={() => handleActionModeChange(actionMode === 'score' ? null : 'score')}
                className={`px-4 py-2 rounded transition-colors font-semibold focus:outline-none ${
                  actionMode === 'score' ? 'bg-lion text-white' : 'bg-payne-grey hover:bg-payne-grey-light text-white border border-uranian-blue/30'
                }`}
              >
                🎯 Score
              </button>
            </div>

            {/* Action-specific reminder text */}
            {actionMode === 'recruit' && (
              <div className="text-sm text-uranian-blue bg-uranian-blue/10 p-2 rounded border border-uranian-blue/30">
                Select dice to recruit with: d4(1), d6(1-2), d8(1-3), d10(1-4), d12(1-5). Selected dice will recruit immediately.
              </div>
            )}
            
            {actionMode === 'promote' && (
              <div className="text-sm text-uranian-blue bg-uranian-blue/10 p-2 rounded border border-uranian-blue/30">
                Select dice at maximum value to promote to the next size. Selected dice will promote immediately.
              </div>
            )}

            {actionMode === 'process' && (
              <div className="text-sm text-uranian-blue bg-uranian-blue/10 p-2 rounded border border-uranian-blue/30">
                Select dice to process for pips. Each die gives 2× its current value in free pips and is removed from your pool.
              </div>
            )}

            {/* Free Pips Options */}
            {actionMode === 'freepips' && (
              <div className="bg-payne-grey/30 p-4 rounded border border-uranian-blue/20 space-y-3">
                <h6 className="text-sm font-semibold text-uranian-blue">Free Pip Actions</h6>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => actions.handlePipAction('increase')}
                    disabled={selectedDice.length !== 1 || currentPlayer.freePips < 4}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded transition-colors font-semibold text-white text-sm focus:outline-none"
                  >
                    +1 Value (4 pips)
                  </button>
                  <button
                    onClick={() => actions.handlePipAction('decrease')}
                    disabled={selectedDice.length !== 1 || currentPlayer.freePips < 3}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded transition-colors font-semibold text-white text-sm focus:outline-none"
                  >
                    -1 Value (3 pips)
                  </button>
                  <button
                    onClick={() => actions.handlePipAction('reroll')}
                    disabled={selectedDice.length !== 1 || currentPlayer.freePips < 2}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded transition-colors font-semibold text-white text-sm focus:outline-none"
                  >
                    Reroll (2 pips)
                  </button>
                  <button
                    onClick={() => actions.handleFactoryAction('effect')}
                    disabled={currentPlayer.freePips < 7}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded transition-colors font-semibold text-white text-sm focus:outline-none"
                  >
                    Buy Effect (7 pips)
                  </button>
                  <button
                    onClick={() => actions.handleFactoryAction('modification')}
                    disabled={currentPlayer.freePips < 9}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded transition-colors font-semibold text-white text-sm col-span-2 focus:outline-none"
                  >
                    Buy Modification (9 pips)
                  </button>
                </div>
                <div className="text-xs text-uranian-blue">
                  Select exactly one die for value modification or reroll actions.
                </div>
              </div>
            )}

            {/* Score Options */}
            {actionMode === 'score' && (
              <div className="bg-payne-grey/30 p-4 rounded border border-uranian-blue/20 space-y-3">
                <h6 className="text-sm font-semibold text-uranian-blue">Scoring Options</h6>
                <div className="text-xs text-uranian-blue mb-3">
                  <div><strong>Straights:</strong> 3+ consecutive dice values (1-2-3, 2-3-4, etc.) = highest value × dice count</div>
                  <div><strong>Sets:</strong> 4+ dice with same value = value × (dice count + 1)</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={actions.handleScoreStraight}
                    disabled={selectedDice.length < 3}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors font-semibold text-white text-sm flex-1 focus:outline-none"
                  >
                    Score Straight ({selectedDice.length} selected)
                  </button>
                  <button
                    onClick={actions.handleScoreSet}
                    disabled={selectedDice.length < 4}
                    className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors font-semibold text-white text-sm flex-1 focus:outline-none"
                  >
                    Score Set ({selectedDice.length} selected)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FUNCTIONAL SECTION */}
          <div className="space-y-3 pt-4 border-t border-uranian-blue/30">
            <h5 className="text-sm font-semibold text-uranian-blue">Functional Actions</h5>
            
            <div className="flex flex-wrap gap-2">
              {/* Undo Button - FIXED: Show when there are actions to undo */}
              {currentPlayer.currentTurnActions && currentPlayer.currentTurnActions.length > 0 && (
                <button
                  onClick={actions.handleUndo}
                  className="bg-payne-grey hover:bg-uranian-blue border border-uranian-blue/30 hover:border-uranian-blue px-4 py-2 rounded transition-colors font-semibold text-white focus:outline-none"
                >
                  ↶ Undo
                </button>
              )}

              {/* End Turn Button */}
              {!pendingEndTurn ? (
                <button
                  onClick={() => setPendingEndTurn(true)}
                  className="bg-payne-grey hover:bg-uranian-blue border border-uranian-blue/30 hover:border-uranian-blue px-4 py-2 rounded transition-colors font-semibold text-white focus:outline-none"
                >
                  ✅ End Turn
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      actions.handleEndTurn();
                      setPendingEndTurn(false);
                    }}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors font-semibold text-white focus:outline-none"
                  >
                    Confirm End Turn
                  </button>
                  <button
                    onClick={() => setPendingEndTurn(false)}
                    className="bg-payne-grey hover:bg-uranian-blue border border-uranian-blue/30 hover:border-uranian-blue px-4 py-2 rounded transition-colors font-semibold text-white focus:outline-none"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Flee Factory Button - Only show when collapse started */}
              {gameState.collapseStarted && (
                <button
                  onClick={actions.handleFlee}
                  className="bg-payne-grey hover:bg-uranian-blue border border-uranian-blue/30 hover:border-uranian-blue px-4 py-2 rounded transition-colors font-semibold text-white focus:outline-none"
                >
                  🚪 Flee Factory
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDicePool;