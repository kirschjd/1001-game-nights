// 1001 Game Nights - Dice Factory Game Component
// Version: 0.2.1 - Slot-based abilities with drag-and-drop
// Updated: October 2025

import React, { useState, useEffect } from 'react';
import { GameState, Die, Card, Ability } from './types';
import DiceRenderer from './DiceRenderer';

interface DiceFactoryGameProps {
  gameState: GameState;
  socket: any;
  isLeader: boolean;
}

interface AbilityDisplayInfo {
  description: string;
  needsDirection?: boolean; // For bump ability
  needsAmount?: boolean; // For bumpUp/bumpDown amount selection
}

// Display information for abilities (descriptions and UI hints)
const ABILITY_DISPLAY_INFO: { [key: string]: AbilityDisplayInfo } = {
  'recruit': { description: 'Add a new d4 to your pool (starts exhausted). Cost increases with pool size: +1 die per die over 5' },
  'promote': { description: 'Upgrade die size (d4→d6→d8→d10→d12)' },
  'reroll': { description: 'Reroll a die' },
  'bump': { description: 'Increase or decrease die value by 1', needsDirection: true },
  'bumpUp': { description: 'Increase die value by 1-3', needsAmount: true },
  'bumpDown': { description: 'Decrease die value by 1-3', needsAmount: true },
  'setValue': { description: 'Set die to specific value' },
  'massReroll': { description: 'Reroll up to 3 dice' },
  'attack': { description: 'Every other player must exhaust a die (no effect in solo)' },
  'massBump': { description: 'Move up to 2 dice up or down by 1', needsDirection: true },
  'twosReroll': { description: 'Reroll all dice showing 2' },
  'score': { description: 'Gain 1 Victory Point' },
  'targetedRecruit': { description: 'Recruit a die matching the target die\'s size (starts exhausted). Cost: recruit limit +1' },
  'recruitPlus': { description: 'Add a new d4 to your pool (starts exhausted). Cost: recruit limit +2' },
  'attackPlus': { description: 'Every other player must exhaust 2 dice of their choice' },
  'unexhaust': { description: 'Unexhaust a target die' },
  'swapSlots': { description: 'Swap two abilities between slots (must respect tier restrictions)' },
  'scorePlus': { description: 'Gain 2 Victory Points' },
  'massBumpPlus': { description: 'Move 1-3 dice by the same amount (1-3) up or down', needsDirection: true, needsAmount: true },
  'massRerollPlus': { description: 'Reroll any number of dice' },
  'clearSlot': { description: 'Clear a slot - it can be filled with any legal slot ability' },
  'cardUnexhaust': { description: 'Unexhaust a card' },
  'selectValue': { description: 'Set die to any value' },
  'scorePlusPlus': { description: 'Gain 3 Victory Points' },
  'cardCostReduction': { description: 'Reduce a card\'s cost by 1 die requirement' },
  'swapPlus': { description: 'Swap any 2 abilities between slots (ignores tier restrictions)' },
  'massUnexhaust': { description: 'Unexhaust up to 2 cards' },
  'targetAttack': { description: 'All players exhaust all dice with the targeted value' },
  'targetedUnexhaust': { description: 'Unexhaust all your dice with the targeted value' },
};

const DiceFactoryGame: React.FC<DiceFactoryGameProps> = ({
  gameState,
  socket,
  isLeader
}) => {
  const [message, setMessage] = useState<string>('');
  const [draggedAbilityId, setDraggedAbilityId] = useState<string | null>(null);
  const [draggedDieId, setDraggedDieId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  // Attack response state
  const [attackRequest, setAttackRequest] = useState<{
    attackId: string;
    attackerName: string;
    diceCount: number;
    type: string;
  } | null>(null);
  const [selectedAttackDice, setSelectedAttackDice] = useState<string[]>([]);

  // Action panel state
  const [activeAbilityId, setActiveAbilityId] = useState<string | null>(null);
  const [activeSlotNumber, setActiveSlotNumber] = useState<number | null>(null);
  const [costDice, setCostDice] = useState<string[]>([]);
  const [costCards, setCostCards] = useState<string[]>([]); // Cards used as virtual dice
  const [targetDieIds, setTargetDieIds] = useState<string[]>([]); // Changed to array for multi-target support
  const [targetValue, setTargetValue] = useState<string>('');
  const [bumpDirection, setBumpDirection] = useState<'up' | 'down'>('up');
  const [bumpAmount, setBumpAmount] = useState<number>(1);

  // Card buying state
  const [buyingCard, setBuyingCard] = useState<Card | null>(null);
  const [cardCostDice, setCardCostDice] = useState<string[]>([]);

  const {
    round,
    dicePool,
    gameLog,
    playerName,
    playerId,
    exhaustedDice,
    slots,
    tier0Abilities,
    availableTier1Abilities,
    availableTier2Abilities,
    availableTier3Abilities,
    availableTier4Abilities,
    availableCards,
    playerCards,
    exhaustedCards,
    victoryPoints,
    phase,
    players,
    turnOrder,
    currentPlayerIndex,
    actionsRemaining,
    recruitCost,
    targetedRecruitCost,
    recruitPlusCost
  } = gameState;

  // Get current player info
  const currentPlayerId = turnOrder ? turnOrder[currentPlayerIndex || 0] : playerId;
  const isMyTurn = currentPlayerId === playerId;
  const currentPlayerName = players?.find(p => p.id === currentPlayerId)?.name || playerName;

  // Get all available abilities
  const allAvailableAbilities: Ability[] = [
    ...tier0Abilities,
    ...availableTier1Abilities,
    ...availableTier2Abilities,
    ...availableTier3Abilities,
    ...availableTier4Abilities
  ];

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleError = (data: { error: string }) => {
      showMessage(`Error: ${data.error}`);
    };

    const handleAttackRequest = (data: { attackId: string; attackerName: string; diceCount: number; type: string }) => {
      setAttackRequest(data);
      setSelectedAttackDice([]);
    };

    socket.on('dice-factory:error', handleError);
    socket.on('dice-factory:attack-request', handleAttackRequest);

    return () => {
      socket.off('dice-factory:error', handleError);
      socket.off('dice-factory:attack-request', handleAttackRequest);
    };
  }, [socket]);

  // Helper to get ability by ID
  const getAbilityById = (abilityId: string): Ability | undefined => {
    return allAvailableAbilities.find(a => a.id === abilityId);
  };

  // Helper to get slot tier
  const getSlotTier = (slotNumber: number): number => {
    if (slotNumber >= 1 && slotNumber <= 4) return 0;
    if (slotNumber >= 5 && slotNumber <= 6) return 1;
    if (slotNumber >= 7 && slotNumber <= 8) return 2;
    if (slotNumber >= 9 && slotNumber <= 10) return 3;
    if (slotNumber >= 11 && slotNumber <= 12) return 4;
    return 0;
  };

  // Helper to get display info for an ability
  const getAbilityDisplayInfo = (abilityId: string): AbilityDisplayInfo | undefined => {
    const ability = getAbilityById(abilityId);
    if (ability && ability.effect) {
      return ABILITY_DISPLAY_INFO[ability.effect] || { description: 'No description available' };
    }
    return ABILITY_DISPLAY_INFO[abilityId] || { description: 'No description available' };
  };

  // Check if die is exhausted
  const isDieExhausted = (dieId: string): boolean => {
    return exhaustedDice?.includes(dieId) || false;
  };

  // Check if card is exhausted
  const isCardExhausted = (cardId: string): boolean => {
    return exhaustedCards?.includes(cardId) || false;
  };

  // === CARD HANDLERS ===

  const handleCardClick = (card: Card) => {
    if (buyingCard && buyingCard.id === card.id) {
      // Cancel buying
      setBuyingCard(null);
      setCardCostDice([]);
    } else {
      // Start buying this card
      setBuyingCard(card);
      setCardCostDice([]);
    }
  };

  const handleCardCostDieAdd = (dieId: string) => {
    if (buyingCard && !cardCostDice.includes(dieId)) {
      setCardCostDice([...cardCostDice, dieId]);
    }
  };

  const handleCardCostDieRemove = (dieId: string) => {
    setCardCostDice(cardCostDice.filter(id => id !== dieId));
  };

  const handleBuyCard = () => {
    if (!buyingCard) return;

    socket?.emit('dice-factory:buy-card', {
      cardId: buyingCard.id,
      costDiceIds: cardCostDice
    });

    setBuyingCard(null);
    setCardCostDice([]);
    showMessage(`Buying ${buyingCard.title}...`);
  };

  const handleCancelBuy = () => {
    setBuyingCard(null);
    setCardCostDice([]);
  };

  const handleUseCardDice = (cardId: string) => {
    socket?.emit('dice-factory:use-card-dice', { cardId });
    showMessage('Card exhausted! Use the corresponding slot now.');
  };

  // === DRAG AND DROP HANDLERS ===

  // Ability drag handlers
  const handleAbilityDragStart = (abilityId: string) => {
    setDraggedAbilityId(abilityId);
  };

  const handleAbilityDragEnd = () => {
    setDraggedAbilityId(null);
  };

  // Slot drop handlers
  const handleSlotDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSlotDrop = (e: React.DragEvent, slotNumber: number) => {
    e.preventDefault();
    if (draggedAbilityId) {
      const ability = getAbilityById(draggedAbilityId);
      const slotTier = getSlotTier(slotNumber);

      if (ability && ability.tier > slotTier) {
        showMessage(`Tier ${ability.tier} abilities can only be assigned to tier ${ability.tier}+ slots`);
        setDraggedAbilityId(null);
        return;
      }

      socket?.emit('dice-factory:assign-slot', { slotNumber, abilityId: draggedAbilityId });
      setDraggedAbilityId(null);
      showMessage(`Assigned ${ability?.name} to slot ${slotNumber}`);
    }
  };

  // Die drag handlers
  const handleDieDragStart = (dieId: string) => {
    setDraggedDieId(dieId);
  };

  const handleDieDragEnd = () => {
    setDraggedDieId(null);
  };

  // Card drag handlers (for using as cost)
  const handleCardDragStart = (cardId: string) => {
    setDraggedCardId(cardId);
  };

  const handleCardDragEnd = () => {
    setDraggedCardId(null);
  };

  // Cost section drop handlers
  const handleCostDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCostDrop = (e: React.DragEvent) => {
    e.preventDefault();

    // Get the current ability to check cost limit
    const ability = activeAbilityId ? getAbilityById(activeAbilityId) : null;
    let costLimit = ability?.costCount || 1;
    if (activeAbilityId === 'recruit') {
      costLimit = recruitCost || 1;
    } else if (ability?.effect === 'targetedRecruit') {
      costLimit = targetedRecruitCost || 1;
    } else if (ability?.effect === 'recruitPlus') {
      costLimit = recruitPlusCost || 1;
    }

    const currentTotal = costDice.length + costCards.length;

    if (draggedDieId && !costDice.includes(draggedDieId)) {
      // Only add if we haven't reached the cost limit
      if (currentTotal < costLimit) {
        setCostDice([...costDice, draggedDieId]);
      }
      setDraggedDieId(null);
    } else if (draggedCardId && !costCards.includes(draggedCardId)) {
      // Only add if we haven't reached the cost limit
      if (currentTotal < costLimit) {
        setCostCards([...costCards, draggedCardId]);
      }
      setDraggedCardId(null);
    }
  };

  // Target section drop handlers
  const handleTargetDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTargetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedDieId && !targetDieIds.includes(draggedDieId)) {
      setTargetDieIds([...targetDieIds, draggedDieId]);
      setDraggedDieId(null);
    }
  };

  // === ACTION HANDLERS ===

  const handleSlotClick = (slotNumber: number) => {
    if (!slots) return;
    const abilityId = slots[slotNumber];
    if (abilityId) {
      setActiveAbilityId(abilityId);
      setActiveSlotNumber(slotNumber);
      setCostDice([]);
      setCostCards([]);
      setTargetDieIds([]);
      setTargetValue('');
      setBumpDirection('up');
      setBumpAmount(1);
    }
  };

  const handleClearSlot = (e: React.MouseEvent, slotNumber: number) => {
    e.stopPropagation();
    socket?.emit('dice-factory:assign-slot', { slotNumber, abilityId: null });
    showMessage(`Cleared slot ${slotNumber}`);
  };

  const handleRemoveCostDie = (dieId: string) => {
    setCostDice(costDice.filter(id => id !== dieId));
  };

  const handleRemoveCostCard = (cardId: string) => {
    setCostCards(costCards.filter(id => id !== cardId));
  };

  const handleRemoveTargetDie = (dieId: string) => {
    setTargetDieIds(targetDieIds.filter(id => id !== dieId));
  };

  const handleExecuteAbility = () => {
    if (!activeAbilityId) return;
    if (activeSlotNumber === null) {
      showMessage('Please click a slot to activate an ability');
      return;
    }

    const ability = getAbilityById(activeAbilityId);
    if (!ability) return;

    // Use dynamic recruit cost if applicable
    let costCount = ability.costCount || 1;
    if (activeAbilityId === 'recruit') {
      costCount = recruitCost || 1;
    } else if (ability.effect === 'targetedRecruit') {
      costCount = targetedRecruitCost || 1;
    } else if (ability.effect === 'recruitPlus') {
      costCount = recruitPlusCost || 1;
    }

    const needsTarget = ability.needsTarget !== false; // Default to true if not specified

    // Validate total cost items (dice + cards)
    const totalCost = costDice.length + costCards.length;
    if (totalCost !== costCount) {
      showMessage(`${ability.name} requires ${costCount} cost dice/cards`);
      return;
    }

    if (needsTarget && targetDieIds.length === 0) {
      showMessage(`${ability.name} requires at least one target die`);
      return;
    }

    // Validate multi-target abilities
    if (ability.multiTarget && ability.maxTargets && targetDieIds.length > ability.maxTargets) {
      showMessage(`${ability.name} can only target up to ${ability.maxTargets} dice`);
      return;
    }

    // Validate abilities that need a target value (setValue, selectValue)
    if ((activeAbilityId === 'setValue' || ability.effect === 'selectValue') && !targetValue) {
      showMessage(`${ability.name} requires a target value`);
      return;
    }

    // Execute - send targetDieIds as array (or single value for backward compatibility)
    socket?.emit('dice-factory:execute-ability', {
      abilityId: activeAbilityId,
      slotNumber: activeSlotNumber,
      costDiceIds: costDice,
      costCardIds: costCards,
      targetDieId: ability.multiTarget ? targetDieIds : targetDieIds[0],
      targetValue: targetValue ? parseInt(targetValue) : null,
      bumpDirection: bumpDirection,
      bumpAmount: bumpAmount
    });

    // Reset action panel
    setActiveAbilityId(null);
    setActiveSlotNumber(null);
    setCostDice([]);
    setCostCards([]);
    setTargetDieIds([]);
    setTargetValue('');
    setBumpDirection('up');
    setBumpAmount(1);
    showMessage(`Executing ${ability.name}...`);
  };

  const handleCancelAction = () => {
    setActiveAbilityId(null);
    setActiveSlotNumber(null);
    setCostDice([]);
    setCostCards([]);
    setTargetDieIds([]);
    setTargetValue('');
    setBumpDirection('up');
    setBumpAmount(1);
  };

  const handlePassTurn = () => {
    socket?.emit('dice-factory:pass-turn', {});
    showMessage('Passing turn...');
  };

  // Attack response handlers
  const handleAttackDiceClick = (dieId: string) => {
    if (!attackRequest) return;

    if (selectedAttackDice.includes(dieId)) {
      setSelectedAttackDice(selectedAttackDice.filter(id => id !== dieId));
    } else {
      if (selectedAttackDice.length < attackRequest.diceCount) {
        setSelectedAttackDice([...selectedAttackDice, dieId]);
      }
    }
  };

  const handleSubmitAttackResponse = () => {
    if (!attackRequest) return;

    if (selectedAttackDice.length === 0) {
      showMessage('You must select at least one die to exhaust');
      return;
    }

    socket?.emit('dice-factory:respond-to-attack', {
      attackId: attackRequest.attackId,
      diceIds: selectedAttackDice
    });

    setAttackRequest(null);
    setSelectedAttackDice([]);
    showMessage('Attack response submitted');
  };

  // Get die by ID
  const getDie = (dieId: string): Die | undefined => {
    return dicePool?.find(d => d.id === dieId);
  };

  // Get card by ID
  const getCard = (cardId: string): Card | undefined => {
    return playerCards?.find(c => c.id === cardId);
  };

  return (
    <div className="flex h-full bg-gray-900 text-white overflow-hidden">
      {/* Attack Response Modal */}
      {attackRequest && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg border-4 border-red-600 shadow-2xl max-w-2xl">
            <h1 className="text-3xl font-bold text-red-400 mb-4">⚔️ Under Attack! ⚔️</h1>
            <p className="text-xl mb-4">
              {attackRequest.attackerName} used {attackRequest.type === 'attackPlus' ? 'Attack+' : 'Attack'}!
            </p>
            <p className="text-lg text-gray-300 mb-6">
              You must exhaust up to {attackRequest.diceCount} {attackRequest.diceCount === 1 ? 'die' : 'dice'}
            </p>

            <div className="mb-6">
              <div className="text-sm font-bold mb-3 text-gray-400">
                Selected: {selectedAttackDice.length}/{attackRequest.diceCount}
              </div>
              <div className="flex flex-wrap gap-3">
                {dicePool?.filter(die => !isDieExhausted(die.id)).map(die => {
                  const isSelected = selectedAttackDice.includes(die.id);
                  return (
                    <div
                      key={die.id}
                      onClick={() => handleAttackDiceClick(die.id)}
                      className={`cursor-pointer transition-all ${isSelected ? 'ring-4 ring-red-400 scale-110' : 'hover:scale-105'}`}
                    >
                      <DiceRenderer
                        die={die}
                        size="lg"
                        isSelected={isSelected}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleSubmitAttackResponse}
                disabled={selectedAttackDice.length === 0}
                className={`px-6 py-3 rounded font-bold text-lg ${
                  selectedAttackDice.length > 0
                    ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Exhaust Selected Dice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Overlay */}
      {phase === 'ended' && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg border-4 border-amber-600 text-center shadow-2xl">
            <h1 className="text-5xl font-bold text-amber-700 mb-4">🎉 VICTORY! 🎉</h1>
            <p className="text-2xl mb-2 text-white">You reached {victoryPoints} Victory Points!</p>
            <p className="text-lg text-gray-400">Game completed in {round} rounds</p>
          </div>
        </div>
      )}

      {/* Left Sidebar - Player Cards */}
      <div className="w-64 bg-gray-800 border-r-2 border-gray-700 p-4 flex flex-col overflow-hidden">
        <h2 className="text-xl font-bold mb-3 text-white">Your Cards ({playerCards?.length || 0})</h2>
        <div className="text-sm text-amber-700 font-bold mb-3">
          VP: {victoryPoints}/10
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {playerCards?.map((card: Card) => {
            const exhausted = isCardExhausted(card.id);
            const hasDiceNumbers = (card.effects.diceNumbers?.length || 0) > 0;
            const canDrag = !!(activeAbilityId && hasDiceNumbers && !exhausted);
            return (
              <div
                key={card.id}
                draggable={canDrag}
                onDragStart={() => canDrag && handleCardDragStart(card.id)}
                onDragEnd={handleCardDragEnd}
                className={`p-3 rounded border-2 transition-all ${
                  exhausted
                    ? 'bg-gray-700 border-gray-600 opacity-50'
                    : 'bg-blue-900 border-blue-400'
                } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <div className={`text-sm font-bold ${exhausted ? 'text-gray-500' : 'text-white'}`}>{card.title}</div>
                <div className={`text-xs mt-1 ${exhausted ? 'text-gray-500' : 'text-gray-300'}`}>
                  {card.effects.vp > 0 && <div>+{card.effects.vp} VP</div>}
                  {hasDiceNumbers && (
                    <div className="flex items-center justify-between mt-1">
                      <span>Dice: {card.effects.diceNumbers.join(' or ')}</span>
                      {!exhausted && !activeAbilityId && (
                        <button
                          onClick={() => handleUseCardDice(card.id)}
                          className="px-2 py-1 bg-cyan-500 hover:bg-cyan-600 text-white rounded text-xs"
                        >
                          Use
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {canDrag && (
                  <div className="text-xs text-amber-600 mt-1">
                    Drag to cost section →
                  </div>
                )}
              </div>
            );
          })}
          {(!playerCards || playerCards.length === 0) && (
            <div className="text-gray-500 text-sm text-center mt-4">
              No cards yet. Buy from center!
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden relative">
        {/* Message Display - Floating */}
        {message && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm shadow-lg animate-pulse">
            {message}
          </div>
        )}

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-white">Dice Factory v0.2.1 - Multiplayer</h1>
          <div className="text-lg text-gray-400 mt-1">
            Round {round} | {playerName} | <span className="text-amber-700 font-bold">VP: {victoryPoints}/10</span>
          </div>
          <div className="text-sm mt-1">
            {isMyTurn ? (
              <span className="text-blue-400 font-bold">
                Your Turn - {actionsRemaining} {actionsRemaining === 1 ? 'action' : 'actions'} remaining
              </span>
            ) : (
              <span className="text-gray-400">
                {currentPlayerName}'s Turn - {actionsRemaining} {actionsRemaining === 1 ? 'action' : 'actions'} remaining
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Take 2 actions per move, then play passes. Pass when done for the round!
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Dice Pool */}
          <div className="p-4 bg-gray-800 rounded-lg border-2 border-gray-700">
            <h2 className="text-xl font-bold mb-3 text-white">Dice Pool ({dicePool?.length || 0} dice)</h2>
            <div className="flex flex-wrap gap-3">
              {dicePool?.map((die: Die) => {
                const isExhausted = isDieExhausted(die.id);
                return (
                  <div
                    key={die.id}
                    draggable={!isExhausted}
                    onDragStart={() => handleDieDragStart(die.id)}
                    onDragEnd={handleDieDragEnd}
                    className={`transition-all ${
                      isExhausted
                        ? 'cursor-not-allowed'
                        : 'cursor-grab active:cursor-grabbing'
                    }`}
                    title={isExhausted ? 'Exhausted (used this turn)' : 'Drag to use'}
                  >
                    <DiceRenderer
                      die={die}
                      size="lg"
                      isExhausted={isExhausted}
                      dimmed={isExhausted}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slots - 2 rows x 6 columns */}
          <div className="p-4 bg-gray-800 rounded-lg border-2 border-gray-700">
            <h2 className="text-xl font-bold mb-3 text-white">Ability Slots</h2>
            <div className="text-xs text-gray-400 mb-3">
              Drag abilities here, then click to use
            </div>
            <div className="grid grid-cols-6 gap-3">
              {[[1,2], [3,4], [5,6], [7,8], [9,10], [11,12]].map((column, colIndex) => (
                <div key={colIndex} className="space-y-3">
                  {column.map(slotNum => {
                    const assignedAbilityId = slots?.[slotNum];
                    const ability = assignedAbilityId ? getAbilityById(assignedAbilityId) : null;
                    const slotTier = getSlotTier(slotNum);
                    return (
                      <div
                        key={slotNum}
                        onDragOver={handleSlotDragOver}
                        onDrop={(e) => handleSlotDrop(e, slotNum)}
                        onClick={() => assignedAbilityId && handleSlotClick(slotNum)}
                        className={`p-3 rounded border-2 border-dashed min-h-[80px] flex flex-col ${
                          assignedAbilityId
                            ? 'bg-blue-900 border-blue-500 cursor-pointer hover:bg-blue-800 shadow-sm'
                            : 'bg-gray-700 border-gray-600'
                        }`}
                      >
                        <div className="text-xs text-gray-400 font-bold mb-1">
                          Slot {slotNum} <span className="text-gray-500">(T{slotTier})</span>
                        </div>
                        {assignedAbilityId && ability ? (
                          <div className="flex-1 flex flex-col items-center justify-center relative">
                            <div className="text-sm font-semibold text-center">{ability.name}</div>
                            <button
                              onClick={(e) => handleClearSlot(e, slotNum)}
                              className="absolute top-0 right-0 text-xs text-red-500 hover:text-red-400"
                              title="Clear slot"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-xs text-gray-500 text-center">
                            Empty
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Action Panel (appears when ability clicked) */}
          {activeAbilityId && (() => {
            const ability = getAbilityById(activeAbilityId);
            if (!ability) return null;

            const displayInfo = getAbilityDisplayInfo(activeAbilityId);
            // Use dynamic recruit cost if applicable
            let costCount = ability.costCount || 1;
            if (activeAbilityId === 'recruit') {
              costCount = recruitCost || 1;
            } else if (ability.effect === 'targetedRecruit') {
              costCount = targetedRecruitCost || 1;
            } else if (ability.effect === 'recruitPlus') {
              costCount = recruitPlusCost || 1;
            }
            const needsTarget = ability.needsTarget !== false;

            return (
              <div className="p-4 bg-gray-800 rounded-lg border-2 border-blue-500">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold">
                    Executing: {ability.name}
                  </h2>
                  <div className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
                    Slot {activeSlotNumber}
                  </div>
                </div>
                <div className="text-sm text-gray-300 mb-4">{displayInfo?.description}</div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Cost Section */}
                  <div
                    onDragOver={handleCostDragOver}
                    onDrop={handleCostDrop}
                    className="p-4 bg-gray-800 rounded border-2 border-dashed border-amber-500 min-h-[120px]"
                  >
                    <div className="text-sm font-bold mb-2">
                      Cost ({costDice.length + costCards.length}/{costCount} items)
                    </div>
                    <div className="text-xs text-gray-400 mb-4">Drag dice or cards here</div>
                    <div className="flex flex-wrap gap-2">
                      {costDice.map(dieId => {
                        const die = getDie(dieId);
                        if (!die) return null;
                        return (
                          <div
                            key={dieId}
                            className="relative"
                          >
                            <DiceRenderer
                              die={die}
                              size="sm"
                            />
                            <button
                              onClick={() => handleRemoveCostDie(dieId)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      {costCards.map(cardId => {
                        const card = getCard(cardId);
                        if (!card) return null;
                        return (
                          <div
                            key={cardId}
                            className="px-3 py-2 bg-sky-600 text-white rounded text-sm relative"
                          >
                            <div className="font-bold text-xs">{card.title}</div>
                            <div className="text-xs">Dice: {card.effects.diceNumbers.join('/')}</div>
                            <button
                              onClick={() => handleRemoveCostCard(cardId)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Section */}
                  {needsTarget && (
                    <div
                      onDragOver={handleTargetDragOver}
                      onDrop={handleTargetDrop}
                      className="p-4 bg-gray-800 rounded border-2 border-dashed border-cyan-500 min-h-[120px]"
                    >
                      <div className="text-sm font-bold mb-2">
                        Target Dice {ability.multiTarget && ability.maxTargets && (
                          <span className="text-xs font-normal text-gray-400">
                            ({targetDieIds.length}/{ability.maxTargets} selected)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mb-4">
                        {ability.effect === 'unexhaust' || ability.effect === 'targetedUnexhaust'
                          ? 'Click a die below to select it'
                          : ability.multiTarget
                          ? `Drag dice here (up to ${ability.maxTargets || 'unlimited'})`
                          : 'Drag die here'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {targetDieIds.length > 0 ? targetDieIds.map(dieId => {
                          const die = getDie(dieId);
                          if (!die) return null;
                          return (
                            <div key={dieId} className="relative">
                              <DiceRenderer
                                die={die}
                                size="sm"
                              />
                              <button
                                onClick={() => handleRemoveTargetDie(dieId)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        }) : (
                          <div className="text-gray-500 text-sm">No targets</div>
                        )}
                      </div>

                      {/* Show exhausted dice as clickable options for unexhaust ability */}
                      {ability.effect === 'unexhaust' && exhaustedDice && exhaustedDice.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <div className="text-xs text-gray-400 mb-2">Available exhausted dice:</div>
                          <div className="flex flex-wrap gap-2">
                            {exhaustedDice.map(dieId => {
                              const die = getDie(dieId);
                              if (!die) return null;
                              const isSelected = targetDieIds.includes(dieId);
                              return (
                                <div
                                  key={dieId}
                                  onClick={() => {
                                    if (!isSelected) {
                                      setTargetDieIds([dieId]);
                                    }
                                  }}
                                  className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-400' : 'hover:scale-105'}`}
                                >
                                  <DiceRenderer
                                    die={die}
                                    size="sm"
                                    isExhausted={true}
                                    dimmed={!isSelected}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Show all dice as clickable options for targetedUnexhaust ability */}
                      {ability.effect === 'targetedUnexhaust' && dicePool && dicePool.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <div className="text-xs text-gray-400 mb-2">Select a die (will unexhaust all dice with that value):</div>
                          <div className="flex flex-wrap gap-2">
                            {dicePool.map((die: Die) => {
                              const isExhausted = isDieExhausted(die.id);
                              const isSelected = targetDieIds.includes(die.id);
                              return (
                                <div
                                  key={die.id}
                                  onClick={() => {
                                    if (!isSelected) {
                                      setTargetDieIds([die.id]);
                                    }
                                  }}
                                  className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-400' : 'hover:scale-105'}`}
                                >
                                  <DiceRenderer
                                    die={die}
                                    size="sm"
                                    isExhausted={isExhausted}
                                    dimmed={!isSelected}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Target Value Input (for setValue and selectValue) */}
                {(activeAbilityId === 'setValue' || ability.effect === 'selectValue') && (
                  <div className="mb-4">
                    <label className="text-sm font-bold mb-1 block">Target Value</label>
                    <input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="Enter value"
                      className="w-32 px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded text-white"
                    />
                  </div>
                )}

                {/* Direction Selector (for bump) */}
                {displayInfo?.needsDirection && (
                  <div className="mb-4">
                    <label className="text-sm font-bold mb-2 block">Direction</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBumpDirection('up')}
                        className={`px-4 py-2 rounded font-semibold ${
                          bumpDirection === 'up'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        ↑ Up
                      </button>
                      <button
                        onClick={() => setBumpDirection('down')}
                        className={`px-4 py-2 rounded font-semibold ${
                          bumpDirection === 'down'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        ↓ Down
                      </button>
                    </div>
                  </div>
                )}

                {/* Amount Selector (for bumpUp/bumpDown) */}
                {displayInfo?.needsAmount && (
                  <div className="mb-4">
                    <label className="text-sm font-bold mb-2 block">Amount to Shift</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map(amount => (
                        <button
                          key={amount}
                          onClick={() => setBumpAmount(amount)}
                          className={`px-4 py-2 rounded font-semibold ${
                            bumpAmount === amount
                              ? 'bg-sky-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleExecuteAbility}
                    className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-semibold"
                  >
                    Execute Ability
                  </button>
                  <button
                    onClick={handleCancelAction}
                    className="px-4 py-2 bg-red-600 hover:bg-red-600 text-white rounded font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Available Cards from Decks */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold mb-3">Factory Cards ({availableCards?.length || 0} available)</h2>
            {/* Sort cards by deck and display in 3 rows */}
            <div className="space-y-3">
              {[1, 2, 3].map(deckNum => {
                const deckCards = availableCards?.filter((c: Card) => c.deckSource === deckNum) || [];
                return (
                  <div key={deckNum}>
                    <div className="text-xs text-gray-400 mb-1">Deck {deckNum}</div>
                    <div className="grid grid-cols-4 gap-3">
                      {deckCards.map((card: Card) => {
                        const isBuying = buyingCard && buyingCard.id === card.id;
                        return (
                          <div
                            key={card.id}
                            onClick={() => handleCardClick(card)}
                            className={`p-3 rounded border-2 cursor-pointer transition-all ${
                              isBuying
                                ? 'bg-cyan-700 border-cyan-500 shadow-lg'
                                : 'bg-gray-700 border-gray-600 hover:border-amber-500'
                            }`}
                          >
                            <div className="text-sm font-bold mb-2">{card.title}</div>
                            <div className="text-xs text-amber-700 mb-2">
                              Cost: {card.cost.join(', ')}
                            </div>
                            <div className="text-xs text-gray-300">
                              {card.effects.vp > 0 && <div className="text-amber-700">+{card.effects.vp} VP</div>}
                              {card.effects.diceNumbers.length > 0 && (
                                <div className="text-sky-600">Dice: {card.effects.diceNumbers.join(' or ')}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Buying Panel */}
          {buyingCard && (
            <div className="p-4 bg-gray-800 rounded-lg border-2 border-amber-500">
              <h2 className="text-xl font-bold mb-3">Buying: {buyingCard.title}</h2>
              <div className="text-sm text-gray-300 mb-4">
                Required cost: {buyingCard.cost.join(', ')}
              </div>
              <div className="mb-4">
                <div className="text-sm font-bold mb-2">
                  Select Dice to Pay ({cardCostDice.length}/{buyingCard.cost.length})
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {dicePool?.filter(die => !isDieExhausted(die.id)).map(die => {
                    const selected = cardCostDice.includes(die.id);
                    return (
                      <div
                        key={die.id}
                        onClick={() =>
                          selected
                            ? handleCardCostDieRemove(die.id)
                            : handleCardCostDieAdd(die.id)
                        }
                        className={`cursor-pointer ${
                          selected
                            ? 'ring-4 ring-yellow-400'
                            : ''
                        }`}
                      >
                        <DiceRenderer
                          die={die}
                          size="md"
                          isSelected={selected}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBuyCard}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-bold"
                >
                  Buy Card
                </button>
                <button
                  onClick={handleCancelBuy}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Pass Turn Button */}
          <div className="p-4 bg-gray-800 rounded-lg border-2 border-gray-700">
            <button
              onClick={handlePassTurn}
              disabled={!isMyTurn}
              className={`px-6 py-3 rounded font-bold text-lg w-full ${
                isMyTurn
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              {isMyTurn ? 'Pass Turn' : `Waiting for ${currentPlayerName}...`}
            </button>
            {players && players.length > 1 && (
              <div className="mt-3 text-sm text-gray-400">
                <div className="font-bold mb-2">Turn Order:</div>
                {turnOrder?.map((pId, idx) => {
                  const p = players.find(player => player.id === pId);
                  if (!p) return null;
                  const isCurrent = idx === currentPlayerIndex;
                  const hasPassed = p.hasPassed;
                  return (
                    <div
                      key={pId}
                      className={`p-2 rounded mb-1 ${
                        isCurrent ? 'bg-blue-900 border-2 border-blue-500 text-white' : 'bg-gray-700 text-white'
                      }`}
                    >
                      {p.name} - {p.victoryPoints} VP
                      {hasPassed && <span className="text-gray-500 ml-2">(Passed)</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Game Log */}
          <div className="p-4 bg-gray-800 rounded-lg border-2 border-gray-700">
            <h3 className="text-lg font-bold mb-2 text-white">Game Log</h3>
            <div className="max-h-48 overflow-y-auto text-sm space-y-1">
              {gameLog.slice(-20).reverse().map((log, idx) => (
                <div key={idx} className="text-gray-300">
                  <span className="text-gray-500">R{log.round}:</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Abilities */}
      <div className="w-80 bg-gray-800 border-l-2 border-gray-700 p-4 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Available Abilities Section */}
          <div>
            <h2 className="text-xl font-bold mb-3 text-white">Available Abilities</h2>
            <div className="text-xs text-gray-400 mb-3">
              Drag to slots to assign (tier restrictions apply)
            </div>

            {/* Tier 0 - Always Available */}
            <div className="mb-4">
              <div className="text-sm font-bold text-amber-500 mb-2">Tier 0 (Slots 1-4)</div>
              <div className="space-y-2">
                {tier0Abilities.map(ability => {
                  const displayInfo = getAbilityDisplayInfo(ability.id);
                  return (
                    <div
                      key={ability.id}
                      draggable
                      onDragStart={() => handleAbilityDragStart(ability.id)}
                      onDragEnd={handleAbilityDragEnd}
                      className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded cursor-grab active:cursor-grabbing shadow-sm"
                    >
                      <div className="font-bold text-sm">{ability.name}</div>
                      <div className="text-xs text-cyan-50">{displayInfo?.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tier 1 */}
            {availableTier1Abilities.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-bold text-sky-600 mb-2">Tier 1 (Slots 5+)</div>
                <div className="space-y-2">
                  {availableTier1Abilities.map(ability => {
                    const displayInfo = getAbilityDisplayInfo(ability.id);
                    return (
                      <div
                        key={ability.id}
                        draggable
                        onDragStart={() => handleAbilityDragStart(ability.id)}
                        onDragEnd={handleAbilityDragEnd}
                        className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded shadow-sm cursor-grab active:cursor-grabbing"
                      >
                        <div className="font-bold text-sm">{ability.name}</div>
                        <div className="text-xs text-sky-50">{displayInfo?.description || 'Tier 1 ability'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tier 2 */}
            {availableTier2Abilities.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-bold text-amber-600 mb-2">Tier 2 (Slots 7+)</div>
                <div className="space-y-2">
                  {availableTier2Abilities.map(ability => {
                    const displayInfo = getAbilityDisplayInfo(ability.id);
                    return (
                      <div
                        key={ability.id}
                        draggable
                        onDragStart={() => handleAbilityDragStart(ability.id)}
                        onDragEnd={handleAbilityDragEnd}
                        className="p-2 bg-amber-700 hover:bg-amber-600 text-white rounded shadow-sm cursor-grab active:cursor-grabbing"
                      >
                        <div className="font-bold text-sm">{ability.name}</div>
                        <div className="text-xs text-amber-50">{displayInfo?.description || 'Tier 2 ability'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tier 3 */}
            {availableTier3Abilities.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-bold text-amber-700 mb-2">Tier 3 (Slots 9+)</div>
                <div className="space-y-2">
                  {availableTier3Abilities.map(ability => {
                    const displayInfo = getAbilityDisplayInfo(ability.id);
                    return (
                      <div
                        key={ability.id}
                        draggable
                        onDragStart={() => handleAbilityDragStart(ability.id)}
                        onDragEnd={handleAbilityDragEnd}
                        className="p-2 bg-amber-700 hover:bg-amber-600 text-white rounded shadow-sm cursor-grab active:cursor-grabbing"
                      >
                        <div className="font-bold text-sm">{ability.name}</div>
                        <div className="text-xs text-amber-50">{displayInfo?.description || 'Tier 3 ability'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tier 4 */}
            {availableTier4Abilities.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-bold text-red-500 mb-2">Tier 4 (Slots 11+)</div>
                <div className="space-y-2">
                  {availableTier4Abilities.map(ability => {
                    const displayInfo = getAbilityDisplayInfo(ability.id);
                    return (
                      <div
                        key={ability.id}
                        draggable
                        onDragStart={() => handleAbilityDragStart(ability.id)}
                        onDragEnd={handleAbilityDragEnd}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded shadow-sm cursor-grab active:cursor-grabbing"
                      >
                        <div className="font-bold text-sm">{ability.name}</div>
                        <div className="text-xs text-red-50">{displayInfo?.description || 'Tier 4 ability'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceFactoryGame;
