// 1001 Game Nights - Enhanced Player Dice Pool Component
// Version: 2.1.0 - Complete UI redesign per specifications
// Updated: December 2024

import React, { useState, useCallback, useEffect } from 'react';
import DiceRenderer from './DiceRenderer';
import { 
  Player, 
  Die,
  ActionMode, 
  DiceActionHandlers, 
  GameStateHelpers,
  MessageType
} from '../../types/DiceFactoryTypes';
import { Socket } from 'socket.io-client';
import PlayedEffects from './PlayedEffects';
import { useModifiedCosts } from '../../hooks/useModifiedCosts';

// ScorePreview component
interface ScorePreviewProps {
  selectedDice: Die[];
  socket: Socket | null;
  currentPlayer: Player;
}

const ScorePreview: React.FC<ScorePreviewProps> = ({ selectedDice, socket, currentPlayer }) => {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDice.length === 0) {
      setPreview(null);
      return;
    }

    setLoading(true);
    const diceIds = selectedDice.map(die => die.id);
    
    socket?.emit('dice-factory-calculate-score-preview', { diceIds });
    
    const handleScorePreview = (data: any) => {
      setPreview(data);
      setLoading(false);
    };

    socket?.on('score-preview-calculated', handleScorePreview);
    
    return () => {
      socket?.off('score-preview-calculated', handleScorePreview);
    };
  }, [selectedDice, socket]);


  if (loading) {
    return <div className="text-xs text-uranian-blue">Calculating...</div>;
  }

  if (!preview) {
    return <div className="text-xs text-uranian-blue">Select dice to see scoring options</div>;
  }

  const hasValidScoring = (preview.straights && preview.straights.length > 0) || (preview.sets && preview.sets.length > 0);

  if (!hasValidScoring) {
    return (
      <div className="text-xs text-uranian-blue">
        {preview.notes.map((note: string, index: number) => (
          <div key={index} className="text-orange-400">{note}</div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-xs text-uranian-blue space-y-1">
      {/* Show all possible straights */}
      {preview.straights && preview.straights.length > 0 && preview.straights.map((straight: any, idx: number) => (
        <div key={idx}>
          <div className="font-medium text-green-400">Straight: {straight.description || ''} {straight.points ? `(${straight.points} pts)` : ''}</div>
          {straight.formula && <div className="text-gray-400">{straight.formula}</div>}
          <div className="text-gray-400">Values: {straight.dice && straight.dice.map((d: any) => d.value).join('-')}</div>
        </div>
      ))}
      {/* Show all possible sets */}
      {preview.sets && preview.sets.length > 0 && preview.sets.map((set: any, idx: number) => (
        <div key={idx}>
          <div className="font-medium text-teal-400">Set: {set.points ? `(${set.points} pts)` : ''}</div>
          {set.formula && <div className="text-gray-400">{set.formula}</div>}
          <div className="text-gray-400">{set.diceCount} dice of value {set.value}</div>
        </div>
      ))}
      {/* Show notes if no valid scoring */}
      {preview.notes && preview.notes.length > 0 && (
        <div className="text-orange-400">
          {preview.notes.map((note: string, index: number) => (
            <div key={index}>{note}</div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  socket?: Socket | null; 
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
  gameState,
  socket
}) => {
  // Score button handler
  const handleScoreClick = () => {
  if (!socket) return;
  socket.emit('dice-factory-score-straight', { diceIds: selectedDice });
  };
  // Score button handler (now in PlayerDicePool scope)
  // Score button handler (now in PlayerDicePool scope)
  const { canTakeActions, isDieSelectable, isExhausted } = helpers;
  const [showDividendChoice, setShowDividendChoice] = useState(false);
  const [pendingEndTurn, setPendingEndTurn] = useState(false);
  const [showArbitrageChoice, setShowArbitrageChoice] = useState(false);
  const [pendingProcessDice, setPendingProcessDice] = useState<string[] | null>(null);

  // Get modified costs from backend
  const { costs } = useModifiedCosts({ socket: socket || null, currentPlayer });

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

    if (actionMode === 'process') {
      const clickedDie = currentPlayer.dicePool.find(d => d.id === dieId);
      if (clickedDie && isDieSelectable(clickedDie, 'process')) {
        // Small delay to allow selection to register first
        setTimeout(() => {
          if (currentPlayer.modifications?.includes('arbitrage')) {
            setPendingProcessDice([dieId]);
            setShowArbitrageChoice(true);
          } else {
            actions.handleProcessDice();
          }
        }, 100);
        return;
      }
    }
  }, [actionMode, currentPlayer.dicePool, currentPlayer.modifications, isDieSelectable, actions, onDiceClick]);

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
        // Check for outsourcing modification - allows any die to recruit
        const hasOutsourcing = currentPlayer?.modifications?.includes('outsourcing');
        if (hasOutsourcing) {
          allEligible = selectedDiceObjects.every(die => die.value !== null);
        } else {
          // Check for diversification modification - allows d4s to recruit on 2 as well as 1
          const hasDiversification = currentPlayer?.modifications?.includes('diversification');
          const recruitTable: Record<number, number[]> = {
            4: hasDiversification ? [1, 2] : [1],
            6: [1, 2],
            8: [1, 2, 3],
            10: [1, 2, 3, 4],
            12: [1, 2, 3, 4, 5]
          };
          allEligible = selectedDiceObjects.every(die => 
            recruitTable[die.sides]?.includes(die.value!) && die.value !== null
          );
        }
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
      if (currentPlayer.modifications?.includes('arbitrage')) {
        setPendingProcessDice([...selectedDice]);
        setShowArbitrageChoice(true);
      } else {
        actions.handleProcessDice();
      }
      return;
    }
    
    // Normal mode toggle
    onActionModeChange(mode);
  }, [selectedDice, currentPlayer, actions, onActionModeChange]);

  // Handler for end turn with Dividend mod
  const handleEndTurnWithDividend = () => {
    if (currentPlayer.modifications?.includes('dividend')) {
      setShowDividendChoice(true);
    } else {
      actions.handleEndTurn();
    }
  };

  // Handler for Dividend choice
  const handleDividendChoice = (choice: 'pips' | 'points') => {
    actions.handleEndTurn(choice);
    setShowDividendChoice(false);
    setPendingEndTurn(false);
  };

  // Handler for reroll all dice (Dice Tower)
  const handleRerollAllDice = () => {
    if (actions.handleRerollAllDice) {
      actions.handleRerollAllDice();
    }
  };

  // Handler for variable dice pool mod
  const handleIncreaseDicePool = () => {
    if (actions.handleIncreaseDicePool) {
      actions.handleIncreaseDicePool();
    }
  };

  // Handler for Arbitrage choice
  const handleArbitrageChoice = (choice: 'pips' | 'points') => {
    if (pendingProcessDice) {
      actions.handleProcessDice(pendingProcessDice, choice);
      setPendingProcessDice(null);
      setShowArbitrageChoice(false);
    }
  };

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


  /**
   * Check if player can afford an action considering Corporate Debt
   */
  const canAffordAction = useCallback((cost: number) => {
    if (!currentPlayer) return false;
    
    const hasCorporateDebt = currentPlayer.modifications?.includes('corporate_debt');
    const minimumPips = hasCorporateDebt ? -20 : 0;
    
    return currentPlayer.freePips - cost >= minimumPips;
  }, [currentPlayer]);


  
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
        <div className="p-4 bg-payne-grey/70 rounded-lg min-h-24 relative border border-uranian-blue/20">
          {/* Dice Grid */}
          <div className="flex flex-wrap gap-3 mb-3">
            {currentPlayer.dicePool.map(die => 
              renderDie(die)
            )}
            {currentPlayer.dicePool.length === 0 && (
              <div className="text-gray-500 italic">No dice in pool</div>
            )}
          </div>
          
          {/* Active Effects - NEW */}
          <PlayedEffects
            socket={socket || null}
            currentPlayer={currentPlayer}
            gameState={gameState}
          />
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
                    disabled={selectedDice.length !== 1 || !canAffordAction(costs.increase)}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded transition-colors font-semibold text-white text-sm focus:outline-none"
                  >
                    +1 Value ({costs.increase} pips)
                  </button>
                  <button
                    onClick={() => actions.handlePipAction('decrease')}
                    disabled={selectedDice.length !== 1 || !canAffordAction(costs.decrease)}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded transition-colors font-semibold text-white text-sm focus:outline-none"
                  >
                    -1 Value ({costs.decrease} pips)
                  </button>
                  <button
                    onClick={() => actions.handlePipAction('reroll')}
                    disabled={selectedDice.length !== 1 || !canAffordAction(costs.reroll)}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded transition-colors font-semibold text-white text-sm focus:outline-none"
                  >
                    Reroll ({costs.reroll} pips)
                  </button>

                </div>
                <div className="text-xs text-uranian-blue">
                  Select exactly one die for value modification or reroll actions.
                  {(currentPlayer.modifications?.includes('improved_rollers') || 
                    currentPlayer.modifications?.includes('due_diligence')) && (
                    <div className="mt-1 text-lion">
                      💡 Modified costs due to your factory modifications!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Score Options */}
            {actionMode === 'score' && (
              <div className="bg-payne-grey/30 p-4 rounded border border-uranian-blue/20 space-y-3">
                <h6 className="text-sm font-semibold text-uranian-blue">Scoring Options</h6>
                <div className="text-xs text-uranian-blue mb-3">
                  <div><strong>Straights:</strong> 3+ consecutive dice values (1-2-3, 2-3-4, etc.) = highest value × dice count</div>
                  <div><strong>Sets:</strong> 3+ dice with same value = value × (dice count + 1)</div>
                </div>
                
                {/* Score Preview */}
                {selectedDice.length > 0 && (
                  <div className="bg-payne-grey/20 p-3 rounded border border-uranian-blue/10">
                    <div className="text-xs text-uranian-blue font-medium mb-2">Score Preview:</div>
                    <ScorePreview 
                      selectedDice={currentPlayer.dicePool.filter(die => selectedDice.includes(die.id))}
                      socket={socket || null}
                      currentPlayer={currentPlayer}
                    />
                  </div>
                )}
                
                <button
                  onClick={handleScoreClick}
                  disabled={selectedDice.length < 3}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors font-semibold text-white text-sm w-full focus:outline-none"
                >
                  Score ({selectedDice.length} selected)
                </button>
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

              {/* Reroll All Dice (Dice Tower) */}
              {currentPlayer.modifications?.includes('dice_tower') && (
                <button
                  onClick={handleRerollAllDice}
                  disabled={!helpers.canTakeActions()}
                  className="bg-yellow-700 hover:bg-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors font-semibold text-white focus:outline-none"
                >
                  🎲 Reroll All Dice (Dice Tower)
                </button>
              )}

              {/* Variable Dice Pool Mod Action */}
              {currentPlayer.modifications?.includes('variable_dice_pool') && (
                <button
                  onClick={handleIncreaseDicePool}
                  disabled={!canAffordAction(10) || !helpers.canTakeActions()}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors font-semibold text-white focus:outline-none"
                >
                  📈 Increase Dice Pool (+1, 10 pips)
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
                    onClick={handleEndTurnWithDividend}
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

      {/* Dividend Choice Modal */}
      {showDividendChoice && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full text-center">
            <h3 className="text-lg font-bold mb-4">Dividend Mod: Convert unused dice to...</h3>
            <button
              onClick={() => handleDividendChoice('pips')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold mr-2"
            >
              Free Pips
            </button>
            <button
              onClick={() => handleDividendChoice('points')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
            >
              Points
            </button>
          </div>
        </div>
      )}

      {/* Arbitrage Choice Modal */}
      {showArbitrageChoice && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full text-center">
            <h3 className="text-lg font-bold mb-4">Arbitrage: Process dice for...</h3>
            <button
              onClick={() => handleArbitrageChoice('pips')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold mr-2"
            >
              Free Pips
            </button>
            <button
              onClick={() => handleArbitrageChoice('points')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
            >
              Points (2× value)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDicePool;